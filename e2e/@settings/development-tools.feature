Feature: Development tools in Settings

  Scenario Outline: Development tools in the <build> build
    Given I use the "<build>" settings build
    When I complete onboarding
    And I go to the Settings
    Then the Development section and Erase data button are "<visibility>"

    Examples:
      | build       | visibility |
      | release     | absent     |
      | preview     | visible    |
      | development | visible    |
