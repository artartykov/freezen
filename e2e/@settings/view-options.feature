Feature: View Options

  Scenario: Task details and word wrapping are enabled by default
    Given I start with onboarding already completed
    When I go to the Next
    Then the task details and word wrapping options are enabled
