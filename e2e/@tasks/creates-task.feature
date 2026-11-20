Feature: Create task

  Background:
    Given I complete onboarding

  Scenario Outline: A task created in <place> appears there
    When I go to <place>
    And I create the following tasks:
      | name                  |
      | Plan the next release |
    Then I see the task "Plan the next release" in <place>

    Examples:
      | place                                  |
      | the Inbox                              |
      | the Focus                              |
      | the Next                               |
      | the Scheduled                          |
      | the Someday                            |
      | the Waiting                            |
      | the Logbook                            |
      | the "Get Started with FreeZen" project |

  Scenario: Creating a task from the Trash adds it to the Inbox
    When I go to the Trash
    And I create the following tasks:
      | name                  |
      | Plan the next release |
    And I go to the Inbox
    Then I see the task "Plan the next release" in the Inbox

  Scenario: Sending a task keeps the composer ready for the next one
    When I go to the Inbox
    And I open the task composer
    Then the task composer has an inactive voice action
    When I expand the description and enter "Release checklist"
    Then the task composer has a disabled send action
    When I enter "Draft release" as the task name and send it
    Then the composer is open with an empty task name and collapsed description
    When I enter "Review release" as the task name and send it
    And I dismiss the task composer
    Then I see the task "Draft release" in the Inbox
    And I see the task "Review release" in the Inbox

  Scenario: The composer applies task properties and scheduled start separately
    When I go to the Inbox
    And I open the task composer
    And I schedule the draft and set its time and due date
    Then the composer shows the start date, due and time in order
    When I enter "Scheduled release" as the task name and send it
    And I dismiss the task composer
    And I go to the Scheduled
    Then I see the task "Scheduled release" in the Scheduled

  @android
  Scenario: The composer remains above the Android keyboard
    When I open the task composer
    Then the focused task name and composer actions fit above the keyboard

  Scenario: Dragging follows the pointer and a filled description returns
    When I go to the Inbox
    And I open the task composer
    Then the description follows the handle before release
    When I enter a description and pull the handle down
    Then the description returns with its text intact

  Scenario: Composer actions return focus to the active input
    When I go to the Inbox
    And I open the task composer
    Then choosing a due date returns focus to the task name
    And changing the destination returns focus to the task name
    When I expand the description and enter "Keep editing here"
    Then starring the task and selecting properties return focus to the description
    And canceling a picker without a focused input does not focus an input

  Scenario: Clicking the handle leaves the description as it was
    When I go to the Inbox
    And I open the task composer
    Then clicking the handle does not expand or collapse the description

  Scenario: Enter sends without moving a collapsed composer
    When I go to the Inbox
    And I open the task composer
    Then sending a task with Enter keeps the composer in place and focuses the task name
