Feature: Onboarding

  Background:
    Given I am a new user

  @android
  Scenario: I complete onboarding on first launch
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

  @todo @android
  Scenario: I return to Focus after restarting the app
    When I complete onboarding
    And I restart the app
    Then I see the Focus page
