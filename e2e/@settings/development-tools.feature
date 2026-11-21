Feature: Settings controls

  @no-data-erasure
  Scenario Outline: The <build> build has no data erasure controls
    Given I use the "<build>" settings build
    When I complete onboarding
    And I go to the Settings
    Then the Development section and Erase data button are absent

    Examples:
      | build       |
      | release     |
      | preview     |
      | development |

  @calendar-settings-disabled
  Scenario: Unavailable settings are disabled
    Given I use the "development" settings build
    When I complete onboarding
    And I go to the Settings
    Then the "Calendar events" setting is disabled
    And the "Long-running notes" setting is disabled
    And the "Daily nudge" setting is disabled
    And the "Weekly Review" setting is disabled

  @date-format-order
  Scenario: Date formats are listed in ISO, RU, US order
    Given I use the "development" settings build
    When I complete onboarding
    And I go to the Settings
    Then Date Format lists ISO, RU, and US in that order

  @time-format-order
  Scenario: Time formats are listed in 24-hour, 12-hour order
    Given I use the "development" settings build
    When I complete onboarding
    And I go to the Settings
    Then Time Format lists the 24-hour option first

  @new-task-placement
  Scenario: New to-dos are placed at the top by default
    Given I use the "development" settings build
    When I complete onboarding
    And I go to the Settings
    Then New to-dos defaults to At the top of lists


  @settings-order
  Scenario: Settings follow the new group order
    Given I use the "development" settings build
    When I complete onboarding
    And I go to the Settings
    Then the settings are shown in the requested order

  @trash-retention
  Scenario: Trash retention defaults to 30 days and saves the selected duration
    Given I use the "development" settings build
    When I complete onboarding
    And I go to the Settings
    Then Trash Retention offers 30, 90, and 180 days with 30 selected
    When I select 90 days for Trash Retention
    Then Trash Retention still shows 90 days after reloading
