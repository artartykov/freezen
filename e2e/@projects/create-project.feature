Feature: Create project

  Background:
    Given I complete onboarding

  @todo
  Scenario: I create a project with a name
    When I click the "New Project" button
    And I enter "FreeZen App" as the project name
    And I click "Save"
    Then I see "FreeZen App" in the project list

  @todo
  Scenario: I save a project without entering a name
    When I click the "New Project" button
    And I click "Save"
    Then I see "Project Name" in the project list

  @todo
  Scenario: I create two projects without entering a name
    When I create 2 projects without entering a name
    Then I see 2 projects named "Project Name" in the project list

  @todo
  Scenario: I create a project with Parallel behavior by default
    When I click the "New Project" button
    And I enter "FreeZen App" as the project name
    And I click "Save"
    And I create the following tasks in the "FreeZen App" project:
      | name                 |
      | Sketch the home page |
      | Build the home page  |
    And I go to the Next
    Then I see all tasks from the "FreeZen App" project in the Next

  @todo
  Scenario: I create a sequential project
    When I click the "New Project" button
    And I enter "FreeZen App" as the project name
    And I select "Sequential" for "Project Behavior"
    And I click "Save"
    And I create the following tasks in the "FreeZen App" project:
      | name                 |
      | Sketch the home page |
      | Build the home page  |
    And I go to the Next
    Then I see only the first task from the "FreeZen App" project in the Next

  @todo
  Scenario: I create a project with tags
    When I click the "New Project" button
    And I enter "FreeZen App" as the project name
    And I add the tags "Computer" and "Work"
    And I click "Save"
    Then I see that the project has the tags "Computer" and "Work"

  @todo
  Scenario: I create a project with a due date
    When I click the "New Project" button
    And I enter "FreeZen App" as the project name
    And I set the due date to "2099-12-31"
    And I click "Save"
    Then I see that the project has a due date of "2099-12-31"
