Feature: Create task

  Background:
    Given I complete onboarding

  @todo
  Scenario Outline: I create a task from <place>
    When I go to <place>
    And I create a task
    Then I see the new task in <destination>

    Examples:
      | place                     | destination               |
      | the Inbox                 | the Inbox                 |
      | the Focus                 | the Focus                 |
      | the Next                  | the Next                  |
      | the Scheduled             | the Scheduled             |
      | the Someday               | the Someday               |
      | the Waiting               | the Waiting               |
      | the Logbook               | the Logbook               |
      | the Trash                 | the Inbox                 |
      | the "Get Started" project | the "Get Started" project |
