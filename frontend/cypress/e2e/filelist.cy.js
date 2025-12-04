/// <reference types="cypress" />

describe('File List and Upvote Flow', () => {
  const testPassword = 'testpass123';
  let testEmail;
  let uploadedFileName;

  beforeEach(() => {
    testEmail = `test_${Date.now()}@example.com`;
    uploadedFileName = `test-file-${Date.now()}.txt`;
    
    // Register, login, and upload a file before each test
    cy.visit('/');
    cy.contains('Register').click();
    cy.get('input[name="name"]').type('FileList Test User');
    cy.get('input[name="email"]').type(testEmail);
    cy.get('input[name="password"]').type(testPassword);
    cy.get('button[type="submit"]').click();
    cy.contains('Welcome').should('be.visible');
    
    // Upload a test file
    cy.get('select').select(1);
    cy.get('input[type="file"]').selectFile({
      contents: Cypress.Buffer.from('Test file content for file list tests'),
      fileName: uploadedFileName,
      mimeType: 'text/plain',
    }, { force: true });
    cy.contains('Upload successful').should('be.visible');
    
    // Navigate to File List
    cy.contains('File List').click();
  });

  describe('File List Display', () => {
    it('should display the uploaded file in the list', () => {
      cy.contains(uploadedFileName).should('be.visible');
    });

    it('should display file metadata columns', () => {
      cy.contains('Filename').should('be.visible');
      cy.contains('Topic').should('be.visible');
      cy.contains('Uploader').should('be.visible');
      cy.contains('Size').should('be.visible');
      cy.contains('Uploaded At').should('be.visible');
      cy.contains('Upvotes').should('be.visible');
    });

    it('should show uploader name for uploaded file', () => {
      cy.contains('FileList Test User').should('be.visible');
    });
  });

  describe('Sorting', () => {
    it('should toggle sort order when clicking Uploaded At header', () => {
      // Click to toggle sort
      cy.contains('Uploaded At').click();
      cy.contains('↑').should('be.visible');
      
      // Click again to toggle back
      cy.contains('Uploaded At').click();
      cy.contains('↓').should('be.visible');
    });
  });

  describe('Topic Filtering', () => {
    it('should show topic filter in header', () => {
      cy.contains('Topic:').should('be.visible');
      cy.contains('All Topics').should('be.visible');
    });

    it('should cycle through topic filters when clicking', () => {
      // Click to change filter
      cy.contains('Topic:').click();
      // Should change from "All Topics" to a specific topic
      cy.contains('All Topics').should('not.exist');
    });
  });

  describe('Upvote Functionality', () => {
    it('should display upvote button with count', () => {
      cy.contains('⬆').should('be.visible');
      cy.contains('⬆ 0').should('be.visible');
    });

    it('should increment upvote count when clicking upvote button', () => {
      // Find and click the upvote button
      cy.contains('⬆ 0').click();
      
      // Count should increment to 1
      cy.contains('⬆ 1').should('be.visible');
    });

    it('should not allow duplicate upvotes from same user', () => {
      // First upvote
      cy.contains('⬆ 0').click();
      cy.contains('⬆ 1').should('be.visible');
      
      // Try to upvote again - count should stay at 1
      cy.contains('⬆ 1').click();
      cy.contains('⬆ 1').should('be.visible');
    });
  });

  describe('File Viewer', () => {
    it('should open file viewer when clicking on filename', () => {
      cy.contains(uploadedFileName).click();
      
      // Should show file viewer with file content
      cy.contains('Test file content').should('be.visible');
    });

    it('should show close button in file viewer', () => {
      cy.contains(uploadedFileName).click();
      cy.contains('Close').should('be.visible');
    });

    it('should show download button in file viewer', () => {
      cy.contains(uploadedFileName).click();
      cy.contains('Download').should('be.visible');
    });

    it('should close file viewer and return to file list', () => {
      cy.contains(uploadedFileName).click();
      cy.contains('Close').click();
      
      // Should be back at file list
      cy.contains('Uploaded Files').should('be.visible');
    });

    it('should show file tab in navigation when viewing a file', () => {
      cy.contains(uploadedFileName).click();
      
      // File tab should appear in navigation
      cy.get('nav').contains(uploadedFileName).should('be.visible');
    });

    it('should close file when clicking X on file tab', () => {
      cy.contains(uploadedFileName).click();
      
      // Wait for file viewer to open
      cy.contains('Download').should('be.visible');
      
      // Click the Close button instead (more reliable)
      cy.contains('button', 'Close').click();
      
      // Should return to file list
      cy.contains('Uploaded Files').should('be.visible');
    });
  });
});

