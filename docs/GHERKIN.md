# Gherkin Scenarios — RAPID Ledger

## Feature: RAPID Document Creation

```gherkin
Feature: RAPID Document Creation

  Scenario: Creator creates a draft RAPID document
    Given I am logged in as a Creator
    When I create a RAPID document with title, decision summary, risk level, department, and deadline
    Then the document should be saved with status "draft"
    And a document code should be generated (e.g. RAPID-001)
    And the version should be set to 1
    And an audit log entry should be created for "document_created"

  Scenario: Draft document can be edited by the Creator
    Given I am logged in as a Creator
    And I have a RAPID document in "draft" status
    When I update any field on the document
    Then the changes should be saved successfully
    And an audit log entry should be created for "document_updated"

  Scenario: Finalized document cannot be directly edited
    Given I am logged in as a Creator
    And a RAPID document has status "finalized"
    When I try to edit the document directly
    Then the edit should be rejected with a 403 error
    And I should be told to create a new version instead

  Scenario: Archived document cannot be edited
    Given I am logged in as a Creator
    And a RAPID document has status "archived"
    When I try to edit the document
    Then the edit should be rejected
    And the document should remain unchanged

  Scenario: Non-creator cannot edit another user's document
    Given I am logged in as a Creator
    And a draft document was created by a different Creator
    When I try to edit that document
    Then the edit should be rejected with a 403 error
```

---

## Feature: Validation Engine

```gherkin
Feature: Validation Engine

  Scenario: Submit a valid low-risk RAPID document
    Given I am logged in as a Creator
    And I have a draft RAPID document with riskLevel "low"
    And the document has a Recommend owner assigned
    And the document has a Perform owner assigned
    And the document has exactly one Decide owner assigned
    And the deadline is in the future
    When I submit the document
    Then the document status should become "submitted"
    And an audit log entry should be created for "document_submitted"

  Scenario: Reject submission when no Decide owner is assigned
    Given I am logged in as a Creator
    And I have a draft RAPID document
    And the document has no Decide owner assigned
    When I submit the document
    Then submission should fail with a validation error
    And I should see the error "Exactly one Decide owner is required"
    And the document status should remain "draft"

  Scenario: Reject submission when multiple Decide owners are assigned
    Given I am logged in as a Creator
    And I have a draft RAPID document
    And the document has two users assigned as Decide owner
    When I submit the document
    Then submission should fail with a validation error
    And I should see the error "Exactly one Decide owner is required"

  Scenario: Reject submission when no Recommend owner is assigned
    Given I am logged in as a Creator
    And I have a draft RAPID document
    And the document has no Recommend owner assigned
    When I submit the document
    Then submission should fail with a validation error
    And I should see the error "A Recommend owner is required"

  Scenario: Reject submission when no Perform owner is assigned
    Given I am logged in as a Creator
    And I have a draft RAPID document
    And the document has no Perform owner assigned
    When I submit the document
    Then submission should fail with a validation error
    And I should see the error "A Perform owner is required"

  Scenario: High-risk decision requires at least one Agree approver
    Given I am logged in as a Creator
    And I have a draft RAPID document with riskLevel "high"
    And the document has no Agree approver assigned
    When I submit the document
    Then submission should fail with a validation error
    And I should see the error "High-risk decisions require at least one Agree approver"

  Scenario: Critical-risk decision requires at least one Agree approver
    Given I am logged in as a Creator
    And I have a draft RAPID document with riskLevel "critical"
    And the document has no Agree approver assigned
    When I submit the document
    Then submission should fail with a validation error
    And I should see the error "High-risk decisions require at least one Agree approver"

  Scenario: Compliance-impacting decision requires evidence
    Given I am logged in as a Creator
    And I have a draft RAPID document with complianceImpact set to true
    And the document has no evidence items attached
    When I submit the document
    Then submission should fail with a validation error
    And I should see the error "Compliance-impacting decisions require evidence"

  Scenario: Compliance-impacting decision with evidence can be submitted
    Given I am logged in as a Creator
    And I have a draft RAPID document with complianceImpact set to true
    And the document has at least one evidence item attached
    And all other required roles are assigned
    When I submit the document
    Then the submission should succeed

  Scenario: Deadline in the past blocks submission
    Given I am logged in as a Creator
    And I have a draft RAPID document with a deadline in the past
    When I submit the document
    Then submission should fail with a validation error
    And I should see the error "Deadline must be in the future"

  Scenario: Rejected document cannot be finalized
    Given I am logged in as the Decide owner
    And a RAPID document has status "rejected"
    When I try to finalize the document
    Then finalization should fail
    And I should see an error indicating the document status is rejected
```

---

## Feature: Approval Workflow

```gherkin
Feature: Approval Workflow

  Scenario: Submitting a high-risk document creates pending approvals
    Given I am logged in as a Creator
    And I have a valid high-risk draft document
    And the document has an Agree approver assigned
    When I submit the document
    Then the document status should become "awaiting_agreement"
    And a pending approval record should be created for the Agree approver
    And an audit log entry should be created for "document_submitted"

  Scenario: Low-risk document without Agree roles skips approval queue
    Given I am logged in as a Creator
    And I have a valid low-risk draft document with no Agree roles assigned
    When I submit the document
    Then the document status should become "approved"
    And no approval records should be created

  Scenario: Approver approves an assigned decision
    Given I am logged in as an Approver
    And I have a pending Agree approval for a document
    When I approve the request with notes
    Then the approval status should become "approved"
    And an audit log entry should be created for "approval_added"

  Scenario: All approvals approved moves document to approved
    Given a document has two Agree approvers assigned
    And both approvers have approved their requests
    When the last approval is submitted
    Then the document status should become "approved"

  Scenario: Approver rejects the document
    Given I am logged in as an Approver
    And I have a pending Agree approval for a document
    When I reject the request with notes
    Then the approval status should become "rejected"
    And the document status should become "rejected"
    And an audit log entry should be created for "document_rejected"

  Scenario: Approver requests changes
    Given I am logged in as an Approver
    And I have a pending Agree approval for a document
    When I request changes with notes
    Then the approval status should become "changes_requested"
    And the document status should become "needs_changes"
    And an audit log entry should be created for "changes_requested"
    And the Creator should be able to edit the document again

  Scenario: Non-approver cannot approve a document
    Given I am logged in as a Creator
    And a document is awaiting agreement
    When I try to approve the document
    Then the action should be rejected with a 403 error

  Scenario: Approver cannot approve a document they are not assigned to
    Given I am logged in as an Approver
    And a document has a different Approver assigned
    When I try to approve the document
    Then the action should be rejected with a 403 error
```

---

## Feature: Finalization and Ledger

```gherkin
Feature: Finalization and Ledger

  Scenario: Decide owner finalizes an approved document
    Given I am logged in as the Decide owner
    And the RAPID document has status "approved"
    When I finalize the document
    Then the document status should become "finalized"
    And a ledger entry should be created with the document details
    And an audit log entry should be created for "document_finalized"
    And an audit log entry should be created for "ledger_entry_created"
    And the document should become read-only

  Scenario: Admin can finalize an approved document
    Given I am logged in as an Admin
    And the RAPID document has status "approved"
    When I finalize the document
    Then the document status should become "finalized"
    And a ledger entry should be created

  Scenario: Non-Decide owner cannot finalize a document
    Given I am logged in as a Creator who is not the Decide owner
    And a document has status "approved"
    When I try to finalize the document
    Then the action should be rejected with a 403 error

  Scenario: Ledger entry is read-only
    Given I am logged in as any user
    And a ledger entry exists for a finalized document
    When I try to modify the ledger entry via the API
    Then the request should be rejected with a 403 error
    And the ledger entry should remain unchanged

  Scenario: Perform owner marks execution complete
    Given I am logged in as the Perform owner
    And a RAPID document has status "finalized"
    When I mark execution complete with execution notes
    Then the document status should become "execution_complete"
    And an audit log entry should be created for "execution_completed"

  Scenario: Execution completion requires execution notes
    Given I am logged in as the Perform owner
    And a RAPID document has status "finalized"
    When I mark execution complete without providing notes
    Then the action should fail with a validation error
    And I should see the error "Execution notes are required"

  Scenario: Non-Perform owner cannot mark execution complete
    Given I am logged in as a Creator
    And a document has status "finalized"
    When I try to mark execution complete
    Then the action should be rejected with a 403 error
```

---

## Feature: Versioning

```gherkin
Feature: Versioning

  Scenario: Create new version from finalized document
    Given I am logged in as the Decision Owner
    And a RAPID document has status "finalized" with version 1
    When I create a new version
    Then a new draft document should be created with version 2
    And the new document should link to the parent via parentDocumentId
    And the previous version should remain read-only with status "finalized"
    And an audit log entry should be created for "version_created"

  Scenario: New version increments version number correctly
    Given a RAPID document is finalized with version 2
    When the Decision Owner creates a new version
    Then the new document should have version 3

  Scenario: Cannot create version from a non-finalized document
    Given I am logged in as the Decision Owner
    And a RAPID document has status "draft"
    When I try to create a new version
    Then the action should be rejected
    And I should see an error indicating only finalized documents can be versioned

  Scenario: Non-Decision Owner cannot create a new version
    Given I am logged in as a Creator
    And a RAPID document has status "finalized"
    When I try to create a new version
    Then the action should be rejected with a 403 error

  Scenario: Both versions are visible in the ledger after v2 is finalized
    Given version 1 of a document is finalized and in the ledger
    And version 2 has been created and then finalized
    When I view the RAPID ledger
    Then I should see two entries for the same document code
    And both entries should show their respective version numbers
```

---

## Feature: Audit Log

```gherkin
Feature: Audit Log

  Scenario: Audit log records all major actions
    Given I perform the following actions on a document:
      | action                   |
      | create document          |
      | assign role              |
      | add evidence             |
      | submit document          |
      | approve document         |
      | finalize document        |
    Then the audit log should contain entries for:
      | action                   |
      | document_created         |
      | role_assigned            |
      | evidence_added           |
      | document_submitted       |
      | approval_added           |
      | document_finalized       |
      | ledger_entry_created     |

  Scenario: Audit log is read-only for Admin
    Given I am logged in as an Admin
    And an audit log entry exists
    When I try to edit or delete the audit log entry via the API
    Then the system should reject the request with a 403 error
    And the audit log entry should remain unchanged

  Scenario: Auditor can view audit log but cannot modify records
    Given I am logged in as an Auditor
    When I view the audit log page
    Then I should see all audit log entries in chronological order
    And I should not see any edit, delete, approve, or finalize action buttons

  Scenario: Creator cannot access the audit log
    Given I am logged in as a Creator
    When I try to access the audit log page
    Then I should be redirected or shown a 403 error

  Scenario: Audit log entry captures actor, action, object, and timestamp
    Given I am logged in as a Creator
    When I create a new RAPID document
    Then the audit log should contain an entry with:
      | field      | value                    |
      | actorId    | my user ID               |
      | action     | document_created         |
      | objectType | RapidDocument            |
      | objectId   | the new document ID      |
      | createdAt  | current timestamp        |
```

---

## Feature: Dashboard and Reports

```gherkin
Feature: Dashboard and Reports

  Scenario: Dashboard shows real document counts
    Given there are 3 draft, 2 submitted, and 1 finalized document in the system
    When I view the dashboard
    Then I should see the count 3 for draft documents
    And I should see the count 2 for submitted documents
    And I should see the count 1 for finalized documents

  Scenario: Dashboard highlights overdue documents
    Given a document has a deadline that has passed
    And the document is not yet finalized
    When I view the dashboard
    Then the overdue count should include that document

  Scenario: Export ledger report as CSV
    Given I am logged in as an Admin
    And there are finalized ledger entries in the system
    When I request the CSV ledger report
    Then a CSV file should be downloaded
    And the file should contain a header row and one data row per finalized document
    And an audit log entry should be created for "report_generated"

  Scenario: Export ledger report as Markdown
    Given I am logged in as an Auditor
    And there are finalized ledger entries in the system
    When I request the Markdown ledger report
    Then a Markdown file should be downloaded
    And the file should contain a formatted table of all finalized decisions

  Scenario: Search documents by status filter
    Given I am logged in as an Admin
    And documents exist with various statuses
    When I filter the dashboard by status "draft"
    Then only documents with status "draft" should be displayed

  Scenario: Filter documents by risk level
    Given I am logged in as an Admin
    And documents exist with various risk levels
    When I filter the dashboard by risk level "high"
    Then only high-risk documents should be displayed

  Scenario: Auditor can export reports but cannot create or edit documents
    Given I am logged in as an Auditor
    When I view the dashboard
    Then I should not see a "Create Document" button
    And I should see export buttons for available reports
```
