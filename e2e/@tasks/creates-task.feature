Feature: Create task

  Background:
    Given I complete onboarding

  Scenario Outline: A task created in <place> appears there
    When I go to <place>
    And I create a task
    Then I see the new task in <place>

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
    And I create a task
    And I go to the Inbox
    Then I see the new task in the Inbox
