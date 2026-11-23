Feature: Effort time format

  Scenario: Switch task estimates between minutes and pomodoros
    Given I complete onboarding
    And I create the following tasks:
      | name      | state | time       |
      | Read book | next  | 15 minutes |
    Then the task "Read book" shows an estimate of "15m"
    When I set Effort time format to "Pomodoro"
    And I go to the Next
    Then the task "Read book" shows an estimate of "🍅"
    When I set Effort time format to "Standard"
    And I go to the Next
    Then the task "Read book" shows an estimate of "15m"
