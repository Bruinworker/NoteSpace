/// <reference types="cypress" />

describe('File Upload Flow', () => {
  const testPassword = 'testpass123';
  let testEmail;

  beforeEach(() => {
    testEmail = `test_${Date.now()}@example.com`;
    
    // Register and login before each test
    cy.visit('/');
    cy.contains('Register').click();
    cy.get('input[name="name"]').type('Upload Test User');
    cy.get('input[name="email"]').type(testEmail);
    cy.get('input[name="password"]').type(testPassword);
    cy.get('button[type="submit"]').click();
    cy.contains('Welcome').should('be.visible');
  });

  describe('Upload Page', () => {
    it('should display the upload page by default after login', () => {
      cy.contains('Upload').should('be.visible');
      cy.contains('Upload File').should('be.visible');
      cy.contains('Select Topic').should('be.visible');
    });

    it('should show topic dropdown with at least one topic', () => {
      cy.get('select').should('be.visible');
      cy.get('select option').should('have.length.greaterThan', 1);
    });

    it('should show drop zone for file upload', () => {
      cy.contains('Click to upload').should('be.visible');
    });
  });

  describe('Topic Creation', () => {
    it('should create a new topic', () => {
      const topicName = `Test Topic ${Date.now()}`;
      
      cy.contains('+ New Topic').click();
      cy.get('input[placeholder="Topic name"]').type(topicName);
      cy.contains('Create').click();
      
      // Should show success and topic should be selected
      cy.contains('Topic created successfully').should('be.visible');
    });
  });

  describe('File Upload', () => {
    it('should upload a text file successfully', () => {
      // Select a topic first
      cy.get('select').select(1); // Select first topic
      
      // Create a test file and upload
      cy.get('input[type="file"]').selectFile({
        contents: Cypress.Buffer.from('This is test content for the file'),
        fileName: 'test-file.txt',
        mimeType: 'text/plain',
      }, { force: true });
      
      // Should show success message
      cy.contains('Upload successful').should('be.visible');
    });

    it('should show error when no topic is selected', () => {
      // Try to upload without selecting topic
      cy.get('input[type="file"]').selectFile({
        contents: Cypress.Buffer.from('Test content'),
        fileName: 'test.txt',
        mimeType: 'text/plain',
      }, { force: true });
      
      cy.contains('Please select a topic').should('be.visible');
    });

    it('should show uploaded file in File List after upload', () => {
      const fileName = `test-file-${Date.now()}.txt`;
      
      // Select topic and upload
      cy.get('select').select(1);
      cy.get('input[type="file"]').selectFile({
        contents: Cypress.Buffer.from('Test file content'),
        fileName: fileName,
        mimeType: 'text/plain',
      }, { force: true });
      
      cy.contains('Upload successful').should('be.visible');
      
      // Navigate to File List
      cy.contains('File List').click();
      
      // Verify file appears in the list
      cy.contains(fileName).should('be.visible');
    });
  });
});

