@todo
Feature: AI settings with system voice recognition

  Background:
    Given I complete onboarding
    And I go to the Settings

  Scenario: The AI section comes after Notifications
    Then I see the following sections in this order:
      | name          |
      | Notifications |
      | AI            |

  Scenario: Initially only Providers and Voice recognition are available
    Then I see the following AI rows:
      | row               | value   |
      | Providers         | Not set |
      | Voice recognition | Not set |
      | Post processing   | Not set |
    And the "Post processing" AI row is unavailable
    And the Enable switch is off and unavailable

  Scenario: Voice recognition test passes without a provider
    When I open the "Voice recognition" AI row
    And I choose "Android system recognizer" from the list
    And I run the test
    Then I see that the test passed

  Scenario: A working key passes the provider test
    When I open the "Providers" AI row
    And I choose "OpenRouter" from the list
    And I enter the key "valid-key"
    And I run the test
    Then I see that the test passed
    And the "Post processing" AI row is available

  Scenario: A wrong key fails the provider test
    When I open the "Providers" AI row
    And I choose "OpenRouter" from the list
    And I enter the key "wrong-key"
    And I run the test
    Then I see that the test failed

  Scenario: Post processing is unavailable until the provider test has passed
    Then the "Post processing" AI row is unavailable

  Scenario: Post processing test passes after the provider test
    Given the provider test has passed
    When I open the "Post processing" AI row
    And I choose the first model from the list
    And I run the test
    Then I see that the test passed

  Scenario: Enable becomes available when all three tests have passed
    Given the provider, voice recognition and post processing tests have passed
    Then the Enable switch is off and available

  Scenario: Changing the key resets the provider and post processing tests
    Given the provider, voice recognition and post processing tests have passed
    And I turn on the Enable switch
    When I open the "Providers" AI row
    And I enter the key "another-key"
    Then the "Post processing" AI row is unavailable
    And the Enable switch is off and unavailable
    And I see the following AI rows:
      | row               | value                     |
      | Voice recognition | Android system recognizer |
