Feature: Create project

  Background:
    Given I complete onboarding

  Scenario: A new project appears in the project list with the chosen name
    When I choose New Project from the menu
    And I enter "FreeZen App" as the project name
    And I save the project
    And I go to the Projects
    Then I see 1 project named "FreeZen App" in the project list

  Scenario: An unnamed project appears as "Project Name"
    When I choose New Project from the menu
    And I save the project
    And I go to the Projects
    Then I see 1 project named "Project Name" in the project list

  Scenario: Two unnamed projects appear as "Project Name"
    When I create 2 projects without entering a name
    And I go to the Projects
    Then I see 2 projects named "Project Name" in the project list

  Scenario: By default, all tasks in a new project appear in Next
    When I choose New Project from the menu
    And I enter "FreeZen App" as the project name
    And I save the project
    And I go to the "FreeZen App" project
    And I create the following tasks:
      | name                 |
      | Sketch the home page |
      | Build the home page  |
    And I go to the Next
    Then I see the following tasks from the "FreeZen App" project in Next:
      | name                 |
      | Sketch the home page |
      | Build the home page  |

  Scenario: Only the first task in a sequential project appears in Next
    When I choose New Project from the menu
    And I enter "FreeZen App" as the project name
    And I select "Sequential" project behavior
    And I save the project
    And I go to the "FreeZen App" project
    And I create the following tasks:
      | name                 |
      | Sketch the home page |
      | Build the home page  |
    And I go to the Next
    Then I see the following tasks from the "FreeZen App" project in Next:
      | name                 |
      | Sketch the home page |

  Scenario: A new project shows the selected tags
    When I choose New Project from the menu
    And I enter "FreeZen App" as the project name
    And I add the tags "Computer" and "Work"
    And I save the project
    Then I see that the project has the tags "Computer" and "Work"

  Scenario: A new project shows the selected due date
    When I choose New Project from the menu
    And I enter "FreeZen App" as the project name
    And I set the due date to "2099-12-31"
    And I save the project
    And I open the saved project's editor
    Then I see that the project has a due date of "2099-12-31"
