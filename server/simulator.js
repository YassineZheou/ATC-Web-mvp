// server/simulator.js
// Handles aircraft movement and state updates

const EventEmitter = require('events');

// Tunisian airports with their coordinates
const AIRPORTS = [
  { name: 'Tunis-Carthage', lat: 36.851, lon: 10.227 },
  { name: 'Enfidha', lat: 36.075, lon: 10.438 },
  { name: 'Sfax', lat: 34.717, lon: 10.69 },
  { name: 'Djerba', lat: 33.875, lon: 10.775 },
  { name: 'Tozeur', lat: 33.93, lon: 8.13 },
];

// Flight phase constants
const FLIGHT_PHASES = {
  TAXIING: 'TAXIING',
  TAKING_OFF: 'TAKING OFF',
  CLIMBING: 'CLIMBING',
  CRUISING: 'CRUISING',
  DESCENDING: 'DESCENDING',
  LANDING: 'LANDING',
};

// Calculate distance between two points in kilometers
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const toRad = (degrees) => degrees * (Math.PI / 180);
  
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate bearing (heading) from point A to point B
function calculateHeading(lat1, lon1, lat2, lon2) {
  const toRad = (degrees) => degrees * (Math.PI / 180);
  const toDeg = (radians) => radians * (180 / Math.PI);
  
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x = 
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  
  let bearing = toDeg(Math.atan2(y, x));
  if (bearing < 0) bearing += 360;
  return Math.round(bearing);
}

// Create a single aircraft object
function createAircraft(id) {
  const departure = AIRPORTS[Math.floor(Math.random() * AIRPORTS.length)];
  const destination = AIRPORTS[Math.floor(Math.random() * AIRPORTS.length)];
  
  return {
    id: id,
    callsign: 'TN' + String(id).padStart(3, '0'),
    lat: departure.lat,
    lon: departure.lon,
    destination: destination,
    altitude: 500, // Start on ground
    speed: 0,
    heading: 0,
    distanceTraveled: 0,
    phase: FLIGHT_PHASES.TAXIING,
    targetAltitude: 10000, // Will climb to this
    climbRate: 500, // feet per minute
  };
}

class Simulator extends EventEmitter {
  constructor(numAircraft = 20) {
    super();
    this.aircraft = [];
    this.activeConflicts = new Map(); // Track ongoing conflicts
    this.initAircraft(numAircraft);
  }

  initAircraft(count) {
    for (let i = 1; i <= count; i++) {
      this.aircraft.push(createAircraft(i));
    }
  }

  // Update all aircraft positions
  updatePositions() {
    for (let plane of this.aircraft) {
      const distToDestination = calculateDistance(
        plane.lat,
        plane.lon,
        plane.destination.lat,
        plane.destination.lon
      );

      // Determine flight phase based on distance to destination and altitude
      this.updateFlightPhase(plane, distToDestination);

      // Update speed based on phase
      this.updateSpeed(plane);

      // Update altitude based on phase
      this.updateAltitude(plane);

      // If plane is close enough to destination, assign new route
      if (distToDestination < 5) {
        const newDest = AIRPORTS[Math.floor(Math.random() * AIRPORTS.length)];
        plane.destination = newDest;
        plane.distanceTraveled = 0;
        plane.altitude = 500;
        plane.phase = FLIGHT_PHASES.TAXIING;
        plane.speed = 0;
      }

      // Calculate heading to destination
      plane.heading = calculateHeading(
        plane.lat,
        plane.lon,
        plane.destination.lat,
        plane.destination.lon
      );

      // Move aircraft toward destination
      const stepDistance = (plane.speed / 3600) * 2; // speed in km/h, 2 second interval
      const moveRatio = stepDistance / distToDestination;

      if (moveRatio < 1) {
        plane.lat += (plane.destination.lat - plane.lat) * moveRatio;
        plane.lon += (plane.destination.lon - plane.lon) * moveRatio;
        plane.distanceTraveled += stepDistance;
      }

      // Round values for display
      plane.altitude = Math.round(plane.altitude);
      plane.speed = Math.round(plane.speed);
    }
  }

  // Determine what phase the aircraft is in
  updateFlightPhase(plane, distToDestination) {
    // Approaching destination - start descending
    if (distToDestination < 50) {
      if (plane.altitude > 1000) {
        plane.phase = FLIGHT_PHASES.DESCENDING;
        plane.targetAltitude = 500;
      } else {
        plane.phase = FLIGHT_PHASES.LANDING;
      }
    }
    // Taking off - accelerate and climb
    else if (plane.phase === FLIGHT_PHASES.TAXIING && plane.speed > 50) {
      plane.phase = FLIGHT_PHASES.TAKING_OFF;
    }
    else if (plane.phase === FLIGHT_PHASES.TAKING_OFF && plane.altitude > 1000) {
      plane.phase = FLIGHT_PHASES.CLIMBING;
      plane.targetAltitude = 10000 + Math.random() * 5000; // Random cruise altitude
    }
    // Reached cruise altitude
    else if (plane.phase === FLIGHT_PHASES.CLIMBING && plane.altitude >= plane.targetAltitude - 200) {
      plane.phase = FLIGHT_PHASES.CRUISING;
    }
  }

  // Update speed based on flight phase
  updateSpeed(plane) {
    const maxSpeed = 480; // km/h cruise
    const targetSpeed = {
      [FLIGHT_PHASES.TAXIING]: 0,
      [FLIGHT_PHASES.TAKING_OFF]: 250,
      [FLIGHT_PHASES.CLIMBING]: 300,
      [FLIGHT_PHASES.CRUISING]: maxSpeed,
      [FLIGHT_PHASES.DESCENDING]: 350,
      [FLIGHT_PHASES.LANDING]: 150,
    };

    const target = targetSpeed[plane.phase];
    const acceleration = 20; // km/h per update cycle

    if (plane.speed < target) {
      plane.speed = Math.min(plane.speed + acceleration, target);
    } else if (plane.speed > target) {
      plane.speed = Math.max(plane.speed - acceleration, target);
    }
  }

  // Update altitude based on flight phase
  updateAltitude(plane) {
    const climbRateFtMin = plane.climbRate;
    const descentRateFtMin = 500; // Descent is faster
    const metersPerSecond = 2; // Each update is 2 seconds

    // Convert feet/minute to meters/second, then to meters per update
    const climbPerUpdate = (climbRateFtMin * 0.3048) / 60 * 2;
    const descentPerUpdate = (descentRateFtMin * 0.3048) / 60 * 2;

    if (plane.phase === FLIGHT_PHASES.TAXIING || plane.phase === FLIGHT_PHASES.LANDING) {
      // Stay on ground
      plane.altitude = 500;
    }
    else if (plane.phase === FLIGHT_PHASES.TAKING_OFF) {
      plane.altitude += climbPerUpdate * 1.5; // Faster climb on takeoff
    }
    else if (plane.phase === FLIGHT_PHASES.CLIMBING) {
      if (plane.altitude < plane.targetAltitude) {
        plane.altitude += climbPerUpdate;
      }
    }
    else if (plane.phase === FLIGHT_PHASES.CRUISING) {
      // Maintain altitude with small variations
      plane.altitude += (Math.random() - 0.5) * 20;
    }
    else if (plane.phase === FLIGHT_PHASES.DESCENDING) {
      if (plane.altitude > plane.targetAltitude) {
        plane.altitude -= descentPerUpdate;
      }
    }
  }

  // Check for conflicts between aircraft
  detectConflicts() {
    const currentConflicts = new Map(); // Current conflicts this cycle
    const newAlerts = []; // New conflicts to alert on
    
    // Find all current conflicts
    for (let i = 0; i < this.aircraft.length; i++) {
      for (let j = i + 1; j < this.aircraft.length; j++) {
        const a = this.aircraft[i];
        const b = this.aircraft[j];
        
        const distance = calculateDistance(a.lat, a.lon, b.lat, b.lon);
        const altitudeDifference = Math.abs(a.altitude - b.altitude);
        
        // Conflict threshold: within 15 km horizontally and 500m vertically
        if (distance < 15 && altitudeDifference < 500) {
          const conflictId = [a.id, b.id].sort().join('-'); // Unique ID for this pair
          currentConflicts.set(conflictId, {
            aircraft1: a.callsign,
            aircraft2: b.callsign,
            distance: distance.toFixed(1),
            message: `CONFLICT: ${a.callsign} and ${b.callsign} - ${distance.toFixed(1)} km apart`,
          });
          
          // If this conflict is NEW, add it to alerts
          if (!this.activeConflicts.has(conflictId)) {
            newAlerts.push(currentConflicts.get(conflictId));
          }
        }
      }
    }
    
    // Check for conflicts that have ENDED
    for (const conflictId of this.activeConflicts.keys()) {
      if (!currentConflicts.has(conflictId)) {
        const conflict = this.activeConflicts.get(conflictId);
        // Optionally emit a "conflict resolved" alert
        // For now, we'll just silently remove it
      }
    }
    
    // Update active conflicts for next cycle
    this.activeConflicts = currentConflicts;
    
    return newAlerts;
  }

  // Return all aircraft as an array
  getState() {
    return this.aircraft;
  }
}

module.exports = Simulator;