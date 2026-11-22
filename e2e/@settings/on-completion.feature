Feature: On completion setting

  Background:
    Given I complete onboarding
    And I create the following tasks:
      | name   | state | tags |
      | Task 2 | next  | Home |
      | Task 3 | next  | Home |

  Scenario: Completed tasks of the tag appear in Done
    Given I set On completion to "Move to bottom of page"
    And I complete the task "Task 3" in the Next
    When I choose the tag "Home" from the menu
    Then Done is collapsed and shows 1 task
    And I see 1 task on the tag page
    When I toggle Done
    Then Done is expanded and hides its count
    And I see the following tasks in the "Next" group of the tag page:
      | name   |
      | Task 2 |
    And I see the following tasks in the "Done" group of the tag page:
      | name   |
      | Task 3 |
    When I toggle Done
    Then Done is collapsed and shows 1 task

  Scenario: Completed tasks stay in their status group with Leave in place
    Given I set On completion to "Leave in place"
    And I complete the task "Task 3" in the Next
    When I choose the tag "Home" from the menu
    Then there is no Done group
    And I see the following tasks in the "Next" group of the tag page:
      | name   |
      | Task 2 |
      | Task 3 |
