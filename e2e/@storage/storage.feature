Feature: Protect saved notes

  Background:
    Given I complete onboarding
    And I go to the Inbox

  Scenario: A stale tab cannot overwrite a saved task
    Given I open the Inbox in a second tab
    When I create the following tasks:
      | name                  |
      | Saved in the first tab |
    And I wait for storage to finish saving
    And I create "Edited in the second tab" in the second tab
    Then the second tab reports a storage conflict
    And "Saved in the first tab" is still stored

  Scenario: A rejected write can be retried
    Given browser writes are temporarily failing
    When I create the following tasks:
      | name            |
      | Retryable task  |
    Then I see a save error
    When browser writes work again
    And I retry saving
    Then "Retryable task" is still stored

  Scenario: Going back leaves a new draft available
    When I enter "Text worth keeping" in a new task note
    And I go back in browser history
    And I open a new task again
    Then the task note contains "Text worth keeping"

  Scenario: Edits rejected by storage survive a reload
    When I create the following tasks:
      | name           |
      | Existing task  |
    And I wait for storage to finish saving
    And I open the saved task "Existing task"
    Given browser writes are temporarily failing
    When I enter "Recoverable text" in the task note
    Then I see a save error
    When I reload and restore the unsaved changes
    And I open the saved task "Existing task"
    Then the task note contains "Recoverable text"

  Scenario: A full backup can restore a saved note
    When I create the following tasks:
      | name         |
      | Backed up task |
    And I wait for storage to finish saving
    And I export a full backup
    And I restore that backup from a file
    Then "Backed up task" is still stored
