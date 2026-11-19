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
