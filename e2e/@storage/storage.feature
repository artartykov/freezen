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
    Then the composer resets and "Retryable task" is still stored

  Scenario: A failed save keeps the draft available
    Given both storage and recovery writes are temporarily failing
    When I press Save for a new task named "Keep my draft"
    Then I see a save error and the editor still contains "Keep my draft"
    When I retry saving
    Then the save error returns after the retry
    When browser writes work again
    And I retry saving
    Then the composer resets and "Keep my draft" is still stored

  Scenario: Escape closes the save error before asking to discard
    Given both storage and recovery writes are temporarily failing
    When I press Save for a new task named "Unsaved task"
    Then I see a save error and the editor still contains "Unsaved task"
    When I hold Escape while the save error is open
    Then the save error closes and the editor stays open
    When I press Escape
    Then I am asked whether to discard the draft
    When I confirm discarding the draft
    Then I return to the Inbox without a storage warning
    And "Unsaved task" is absent after reloading the Inbox

  Scenario: Edits rejected by storage recover automatically after a reload
    Given I have a saved task called "Existing task"
    And I open the saved task "Existing task"
    And browser writes are temporarily failing
    When I enter "Recoverable text" in the task note
    And I reload the page while that change is saving
    Then the task note contains "Recoverable text"
    And I see no storage warning
