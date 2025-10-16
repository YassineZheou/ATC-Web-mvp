// server/users.js
// Simple user database (replace with real DB later)

const users = [
  {
    username: 'controller1',
    password: '1234',
    role: 'Controller',
  },
  {
    username: 'supervisor1',
    password: 'secure123',
    role: 'Supervisor',
  },
  {
    username: 'dispatcher1',
    password: 'dispatch456',
    role: 'Dispatcher',
  },
];

module.exports = users;