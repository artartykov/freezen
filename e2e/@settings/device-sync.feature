Feature: Device sync

  @device-sync
  Scenario: Approved devices merge offline changes and reconnect
    Given two independent devices have different local tasks
    When the second device enters the code shown by the first device
    Then the second device waits for approval before receiving data
    When the first device approves the pairing
    Then both devices see both tasks and list each other as paired
    And manual sync confirms that both devices have the same data
    When both devices restart and edit different fields of the same task offline
    Then both edits are visible on both devices after reconnecting
    When the first device disconnects the second device
    Then the devices keep their tasks and stop sharing changes

  @device-sync
  Scenario: Rejected pairing keeps each device's data local
    Given two independent devices have different local tasks
    When the second device enters the code shown by the first device
    And the first device rejects the pairing
    Then neither device receives the other's task or lists a paired device
    And manual sync reports failure without an online device

  @android @device-sync-ui
  Scenario: A pairing code can be shown and manually entered
    Given I open FreeZen
    And I complete onboarding
    When I open synchronization settings
    Then I can show a pairing code as text and as a QR code with a countdown
    And the first of eight code fields is focused when I enter a code

  @device-sync-scroll
  Scenario: Synchronization overlays preserve the settings URL and scroll position
    Given I open FreeZen
    And I complete onboarding
    When I open synchronization settings
    Then opening and closing each synchronization overlay preserves the URL and scroll position
