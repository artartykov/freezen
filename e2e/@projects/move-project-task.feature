Feature: Move a project task

  Background:
    Given I start with onboarding already completed

  Scenario: Moving a project task shows its project and current status
    When I choose New Project from the menu
    And I enter "FreeZen App" as the project name
    And I save the project
    And I create the following tasks:
      | name                 |
      | Sketch the home page |
    And I open the move menu for "Sketch the home page"
    Then the move menu marks "FreeZen App" and "Next"
    When I choose "Someday" in the move menu
    And I open the move menu for "Sketch the home page"
    Then the move menu marks "FreeZen App" and "Someday"

  Scenario: Moving a project task to a reference list turns it into a reference item
    Given I create the reference list "Reading list"
    And I choose New Project from the menu
    And I enter "Website" as the project name
    And I save the project
    And I create the following tasks:
      | name           | tags |
      | Read the guide | Work |
    And I open the move menu for "Read the guide"
    When I choose "Reading list" in the move menu
    Then the task "Read the guide" is gone from the project
    When I go to the Reading list
    Then I see "Read the guide" as a reference item

  Scenario: None removes the project without changing the task status
    When I choose New Project from the menu
    And I enter "Website" as the project name
    And I save the project
    And I create the following tasks:
      | name           |
      | Read the guide |
    And I open the move menu for "Read the guide"
    And I choose "Someday" in the move menu
    And I open the move menu for "Read the guide"
    Then "None" is the first option in the "Projects" section of Move
    When I choose "None" in the move menu
    And I press Escape
    And I go to the Someday
    Then I see the task "Read the guide" in the Someday
    When I open the move menu for "Read the guide"
    Then the move menu does not offer "None"
