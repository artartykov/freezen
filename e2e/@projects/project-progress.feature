Feature: Project progress

  Background:
    Given I complete onboarding

  Scenario: Project progress updates when a task is completed
    When I choose New Project from the menu
    And I enter "FreeZen App" as the project name
    And I save the project
    And I go to the "FreeZen App" project
    Then the project header shows "0 of 0 done"
    When I create the following tasks:
      | name                 |
      | Sketch the home page |
      | Build the home page  |
    Then the project header shows "0 of 2 done"
    And the project header shows "2 next"
    When I mark "Sketch the home page" done on the project page
    Then the project header shows "1 of 2 done"
    And the project header shows "1 next"
    And there is no Done group
    And I see the task "Sketch the home page" in the "FreeZen App" project
    When I mark "Build the home page" done on the project page
    Then the project header shows "2 of 2 done"
    And the project header hides "1 next"
    And the project header hides "0 next"
