Feature: Android app updates

  Scenario: Discover an update and check again after dismissing it
    Given the regular Android build has an update to "1.1.0"
    When I open FreeZen
    And I complete onboarding
    Then I see an update prompt for "1.1.0"
    When I choose Later in the update prompt
    And I restart the app
    And I go to the Settings
    Then the update prompt stays closed
    And the update button is between About and Give us 5 stars
    When I check for app updates
    Then I see an update prompt for "1.1.0"
    When I choose Update in the update prompt
    Then FreeZen asks Android to install "1.1.0"

  Scenario: Report when the app is up to date
    Given the regular Android build is up to date
    When I open FreeZen
    And I complete onboarding
    And I go to the Settings
    Then the update prompt stays closed
    When I check for app updates
    Then I see that FreeZen is up to date

  Scenario: Hide updates in FreeZen Dev
    Given I use FreeZen Dev
    When I open FreeZen
    And I complete onboarding
    And I go to the Settings
    Then FreeZen does not check for updates or offer an update button
