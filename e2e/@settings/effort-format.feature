Feature: Effort time format

  Scenario: Switch task estimates between minutes and pomodoros
    Given I complete onboarding
    And I create the following tasks:
      | name      | state | time       |
      | Read book | next  | 45 minutes |
    Then the task "Read book" shows an estimate of "45m"
    When I set Effort time format to "Pomodoro"
    And I go to the Next
    Then the task "Read book" shows 2 pomodoro icons in the list and editor
    When I set Effort time format to "Standard"
    And I go to the Next
    Then the task "Read book" shows an estimate of "45m"
