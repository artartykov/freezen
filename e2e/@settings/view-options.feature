Feature: View Options

  Scenario: Task details and word wrapping are enabled by default
    Given I complete onboarding
    When I go to the Next
    Then the task details and word wrapping options are enabled
