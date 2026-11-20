@storage
Feature: Protect saved notes

  Background:
    Given I complete onboarding
    And I go to the Inbox

  Scenario: Two tabs keep both tasks after concurrent saves
    Given I open the Inbox in a second tab
    When I save "First task" and "Second task" from different tabs
    Then both tabs show "First task" and "Second task"
    And both notes are still in the Inbox after reopening it

  Scenario: Different edits to the same note are both kept
    Given I have a saved task called "Shared task"
    And I open the Inbox in a second tab
    When I edit "Shared task" to say "First version" and "Second version" in different tabs
    Then "Shared task" keeps both versions after reopening it

  Scenario: A temporary storage failure is retried in the background
    Given browser writes are temporarily failing
    When I press Save for a new task named "Retryable task"
    Then its editor stays open while saving
    When browser writes work again
    Then the editor closes and "Retryable task" is still stored

  Scenario: A failed save keeps the draft available
    Given both storage and recovery writes are temporarily failing
    When I press Save for a new task named "Keep my draft"
    Then I see a save error and the editor still contains "Keep my draft"
    When browser writes work again
    And I retry saving
    Then the editor closes and "Keep my draft" is still stored

  Scenario: Going back leaves a new draft available
    When I enter "Text worth keeping" in a new task note
    And I go back in browser history
    And I open a new task again
    Then the task note contains "Text worth keeping"

  Scenario: Edits rejected by storage recover automatically after a reload
    Given I have a saved task called "Existing task"
    And I open the saved task "Existing task"
    And browser writes are temporarily failing
    When I enter "Recoverable text" in the task note
    And I reopen the Inbox while that change is saving
    And I open the saved task "Existing task"
    Then the task note contains "Recoverable text"
    And I see no storage warning

  Scenario: A full backup can restore a saved note
    Given I have a saved task called "Backed up task"
    When I export a full backup
    And I restore that backup from a file
    Then "Backed up task" is still stored
