Feature: Discard a task draft

  Background:
    Given I complete onboarding
    And I go to the Inbox

  Scenario: Going back from a changed draft asks before discarding
    When I enter "Text worth keeping" in a new task note
    And I go back in browser history
    Then I am asked whether to discard the draft
    When I cancel discarding the draft
    Then the task note contains "Text worth keeping"
    When I go back in browser history
    And I confirm discarding the draft
    Then I return to the Inbox without a storage warning

  Scenario: Repeatedly canceling discard with Escape keeps the draft open
    When I open a new task and enter the title "Keep this title"
    And I press Escape
    Then I am asked whether to discard the draft
    And the new task editor stays open behind the confirmation
    When I press Escape
    Then the draft titled "Keep this title" is still open in the Inbox
    When I press Escape
    Then I am asked whether to discard the draft
    And the new task editor stays open behind the confirmation
    When I press Escape
    Then the draft titled "Keep this title" is still open in the Inbox

  Scenario: Closing a changed draft leaves the confirmation unfocused
    When I open a new task and enter the title "Keep this title"
    And I click outside the task composer
    Then I am asked whether to discard the draft
    And I can focus Cancel with Tab

  Scenario Outline: Cancelling discard returns focus to the draft <field>
    When I open the task composer
    And I enter a draft in the "<field>" field
    Then cancelling discard after tapping outside restores focus to the "<field>" field

    Examples:
      | field |
      | To Do |
      | Notes |
