Feature: Device sync

  @device-sync
  Scenario: Independently created tags with the same name merge
    Given two independent devices have different local tasks
    And each device assigns its own version of the same tag to its task
    When the second device enters the code shown by the first device
    And the first device approves the pairing
    Then both devices see both tasks and list each other as paired
    And both devices show one shared tag containing both tasks

  @device-sync
  Scenario: Manual synchronization waits for every connected device
    Given two independent devices have different local tasks
    When the second device enters the code shown by the first device
    And the first device approves the pairing
    Then both devices see both tasks and list each other as paired
    When the first device pairs with a third device
    Then manual sync stays in progress until the third device confirms

  @device-sync
  Scenario: A later note conflict is available in the task editor
    Given two independent devices have different local tasks
    When the second device enters the code shown by the first device
    And the first device approves the pairing
    Then both devices see both tasks and list each other as paired
    When both devices change the same task title offline and reconnect
    And both devices change the same task note offline and reconnect
    Then both note edits are available on each device

  @device-sync
  Scenario: An offline addition remains accessible after a reference list is converted
    Given two independent devices have different local tasks
    When the second device enters the code shown by the first device
    And the first device approves the pairing
    Then both devices see both tasks and list each other as paired
    When the first device creates a reference list and synchronizes it
    And one device converts the list while the other adds an item offline
    Then the added item is available in the recovered list on both devices

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

  @device-sync
  Scenario: Empty Trash affects only the device that emptied it
    Given two independent devices have different local tasks
    When the second device enters the code shown by the first device
    And the first device approves the pairing
    Then both devices see both tasks and list each other as paired
    When the first device moves its task to Trash
    Then the task appears in Trash on both devices
    When the first device empties its Trash and synchronizes
    Then Trash is empty on the first device and still contains the task on the second
    When the second device moves the task from Trash back to Inbox
    Then the restored task appears in Inbox on both devices
    When the first device moves its task to Trash
    Then the task appears in Trash on both devices

  @device-sync
  Scenario Outline: Deleting a task from Trash using the <action> affects only the current device
    Given two independent devices have different local tasks
    When the second device enters the code shown by the first device
    And the first device approves the pairing
    Then both devices see both tasks and list each other as paired
    When the first device moves its task to Trash
    Then the task appears in Trash on both devices
    When the first device deletes its task from Trash using the "<action>" and synchronizes
    Then Trash is empty on the first device and still contains the task on the second

    Examples:
      | action         |
      | selection bar  |
      | task editor    |

  @android
  Scenario: A pairing code can be shown and manually entered
    Given I open FreeZen
    And I complete onboarding
    When I open synchronization settings
    Then I can show a pairing code as text and as a QR code with a countdown
    And the first of eight code fields is focused when I enter a code

  Scenario: Synchronization overlays preserve the settings URL and scroll position
    Given I open FreeZen
    And I complete onboarding
    When I open synchronization settings
    Then opening and closing each synchronization overlay preserves the URL and scroll position

  @device-sync
  Scenario: Paired device appearance and synchronization are visible from the toolbar
    Given two independent devices have different local tasks
    When the second device enters the code shown by the first device
    And the first device approves the pairing
    Then both devices see both tasks and list each other as paired
    When the first device customizes the second device as "Work tablet"
    Then the first device toolbar shows "Work tablet" synchronized
    And the customized device appearance survives a reload
    When both paired devices restart without a connection
    Then the first device still shows "Work tablet" synchronized but offline
    When the first device creates a task while the other device is offline
    Then the first device shows "Work tablet" waiting to sync
    When the devices reconnect
    Then the first device toolbar shows "Work tablet" synchronized
