Feature: Onboarding

  @android
  Scenario: Completing onboarding on first launch opens Focus
    Given I am a new user
    When I open FreeZen
    Then I see the Welcome page
    When I continue
    Then I see the Notifications page
    When I choose to turn on notifications
    And I allow notifications
    Then I see the Calendar page
    When I choose to allow calendar access
    And I allow calendar access
    Then I see the Focus page

  @android
  Scenario: The app returns to Focus after a restart
    When I complete onboarding
    And I restart the app
    Then I see the Focus page
