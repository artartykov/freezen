Feature: Move a project task

  Background:
    Given I complete onboarding

  Scenario: Moving a project task shows its project and current status
    When I choose New Project from the menu
    And I enter "FreeZen App" as the project name
    And I save the project
    And I go to the "FreeZen App" project
    And I create the following tasks:
      | name                 |
      | Sketch the home page |
    And I open the move menu for "Sketch the home page" from "Next"
    Then the move menu marks "FreeZen App" and "Next"
    When I choose "Someday" in the move menu
    And I open the move menu for "Sketch the home page" from "Someday"
    Then the move menu marks "FreeZen App" and "Someday"
