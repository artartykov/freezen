Feature: Task editor actions

  Scenario Outline: More actions opens above its button at <width> pixels
    Given I complete onboarding
    And I go to the Inbox
    And I create the following tasks:
      | name           |
      | Edit this task |
    When I open More actions for "Edit this task" at <width> pixels
    Then the menu is above and right-aligned with the More actions button

    Examples:
      | width |
      | 360   |
      | 1280  |
