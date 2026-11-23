Feature: Automatic trash retention

  Scenario Outline: Startup clears entries older than the <days>-day retention period
    Given the clock is set to the initial retention test date
    And I complete onboarding
    When I go to the Settings
    And I set Trash Retention to "<days> days"
    And I leave Settings
    And I go to the Inbox
    And I create the following tasks:
      | name        |
      | Old task    |
      | Recent task |
    And I move "Old task" to Trash
    And I set the clock to <before> days after the old task was moved to Trash
    And I restart the app
    And I go to the Trash
    Then "Old task" is still in Trash
    When I go to the Inbox
    And I move "Recent task" to Trash
    And I set the clock to <after> days after the old task was moved to Trash
    And I restart the app
    And I go to the Trash
    Then "Recent task" is still in Trash
    And "Old task" is absent from Trash

    Examples:
      | days | before | after |
      | 30   | 29     | 31    |
      | 90   | 89     | 91    |
      | 180  | 179    | 181   |
