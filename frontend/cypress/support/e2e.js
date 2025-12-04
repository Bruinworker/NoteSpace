// ***********************************************************
// This file is processed and loaded automatically before your test files.
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Custom commands for NoteSpace E2E tests

// Generate a unique email for testing
Cypress.Commands.add('getUniqueEmail', () => {
  return `test_${Date.now()}@example.com`;
});

// Register a new user
Cypress.Commands.add('register', (name, email, password) => {
  cy.visit('/');
  cy.contains('Register').click();
  cy.get('input[name="name"]').type(name);
  cy.get('input[name="email"]').type(email);
  cy.get('input[name="password"]').type(password);
  cy.get('button[type="submit"]').click();
});

// Login with existing credentials
Cypress.Commands.add('login', (email, password) => {
  cy.visit('/');
  cy.get('input[name="email"]').type(email);
  cy.get('input[name="password"]').type(password);
  cy.get('button[type="submit"]').click();
});

// Logout
Cypress.Commands.add('logout', () => {
  cy.contains('Logout').click();
});

// Navigate to a specific view
Cypress.Commands.add('navigateTo', (viewName) => {
  cy.contains(viewName).click();
});

// Clear localStorage before each test (optional)
beforeEach(() => {
  cy.window().then((win) => {
    win.localStorage.clear();
  });
});

