/// <reference types="cypress" />

describe('Authentication Flow', () => {
  const testPassword = 'testpass123';
  let testEmail;

  beforeEach(() => {
    // Generate unique email for each test run
    testEmail = `test_${Date.now()}@example.com`;
  });

  describe('User Registration', () => {
    it('should display the login form by default', () => {
      cy.visit('/');
      cy.contains('NoteSpace').should('be.visible');
      cy.contains('Login').should('be.visible');
      cy.contains('Register').should('be.visible');
    });

    it('should switch to register form when clicking Register tab', () => {
      cy.visit('/');
      cy.contains('Register').click();
      cy.get('input[name="name"]').should('be.visible');
      cy.get('input[name="email"]').should('be.visible');
      cy.get('input[name="password"]').should('be.visible');
    });

    it('should register a new user successfully', () => {
      cy.visit('/');
      cy.contains('Register').click();
      cy.get('input[name="name"]').type('Test User');
      cy.get('input[name="email"]').type(testEmail);
      cy.get('input[name="password"]').type(testPassword);
      cy.get('button[type="submit"]').click();
      
      // Should be logged in after registration
      cy.contains('Welcome, Test User').should('be.visible');
      cy.contains('Logout').should('be.visible');
    });

    it('should show error for duplicate email registration', () => {
      // First registration
      cy.visit('/');
      cy.contains('Register').click();
      cy.get('input[name="name"]').type('Test User');
      cy.get('input[name="email"]').type(testEmail);
      cy.get('input[name="password"]').type(testPassword);
      cy.get('button[type="submit"]').click();
      cy.contains('Welcome').should('be.visible');
      
      // Logout and wait for it to complete
      cy.contains('button', 'Logout').click();
      cy.contains('Welcome').should('not.exist');
      
      // Wait for login form to appear
      cy.get('input[name="email"]', { timeout: 15000 }).should('be.visible');
      
      // Try to register with same email
      cy.contains('Register').click();
      cy.get('input[name="name"]').should('be.visible');
      cy.get('input[name="name"]').type('Another User');
      cy.get('input[name="email"]').type(testEmail);
      cy.get('input[name="password"]').type(testPassword);
      
      // Stub the alert before clicking submit
      cy.on('window:alert', (text) => {
        expect(text).to.include('already exists');
        return true;
      });
      
      cy.get('button[type="submit"]').click();
      
      // Should still be on the registration form (not logged in)
      cy.get('input[name="name"]').should('be.visible');
    });
  });

  describe('User Login', () => {
    beforeEach(() => {
      // Register a user first
      cy.visit('/');
      cy.contains('Register').click();
      cy.get('input[name="name"]').type('Login Test User');
      cy.get('input[name="email"]').type(testEmail);
      cy.get('input[name="password"]').type(testPassword);
      cy.get('button[type="submit"]').click();
      cy.contains('Welcome').should('be.visible');
      
      // Logout and wait for it to complete
      cy.contains('button', 'Logout').click();
      cy.contains('Welcome').should('not.exist');
      cy.get('input[name="email"]', { timeout: 15000 }).should('be.visible');
    });

    it('should login with valid credentials', () => {
      // Make sure we're on the Login tab (not Register)
      cy.contains('button', 'Login').click();
      
      cy.get('input[name="email"]').type(testEmail);
      cy.get('input[name="password"]').type(testPassword);
      cy.get('button[type="submit"]').click();
      
      cy.contains('Welcome', { timeout: 10000 }).should('be.visible');
    });

    it('should show error for invalid credentials', () => {
      // Make sure we're on the Login tab
      cy.contains('button', 'Login').click();
      
      // Stub the alert before clicking submit
      cy.on('window:alert', (text) => {
        expect(text).to.include('Invalid');
        return true;
      });
      
      cy.get('input[name="email"]').type(testEmail);
      cy.get('input[name="password"]').type('wrongpassword');
      cy.get('button[type="submit"]').click();
      
      // Should still be on the login form (not logged in)
      cy.get('input[name="email"]').should('be.visible');
    });
  });

  describe('User Logout', () => {
    it('should logout successfully', () => {
      // Register and login
      cy.visit('/');
      cy.contains('Register').click();
      cy.get('input[name="name"]').type('Logout Test');
      cy.get('input[name="email"]').type(testEmail);
      cy.get('input[name="password"]').type(testPassword);
      cy.get('button[type="submit"]').click();
      cy.contains('Welcome').should('be.visible');
      
      // Logout - wait for the button to be visible first
      cy.contains('button', 'Logout').should('be.visible').click();
      
      // Wait for the Welcome message to disappear (means logout completed)
      cy.contains('Welcome').should('not.exist');
      
      // Should show login form again
      cy.get('input[name="email"]', { timeout: 15000 }).should('be.visible');
    });
  });
});

