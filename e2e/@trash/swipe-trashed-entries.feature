Feature: Swipe gestures in Trash

  Scenario: Select and remove a project and a reference list
    Given Trash contains a project and a reference list
    When I go to the Trash
    And I swipe left on the trash row "Old project"
    Then the trash row "Old project" is selected
    When I swipe left on the trash row "Old reference"
    Then the trash row "Old reference" is selected
    When I choose Delete for the selected trash rows
    Then both trash rows are removed from Trash

  Scenario Outline: Restore an entry by swiping right
    Given Trash contains a project and a reference list
    When I go to the Trash
    And I swipe right on the trash row "<name>"
    And I choose Restore from the Move sheet
    Then the trash row "<name>" disappears
    When I go to the <place>
    Then the trash row "<name>" is visible

    Examples:
      | name          | place     |
      | Old project   | Projects  |
      | Old reference | Reference |

  Scenario: Show separately trashed tasks alongside their trashed project
    Given I moved four tasks to Trash before moving their project
    When I go to the Trash
    Then the trash row "Get started" counts 3 tasks
    And all four separately trashed tasks are visible
    When I swipe right on the trash row "Get started"
    And I choose Restore from the Move sheet
    Then the trash row "Get started" disappears
    And all four separately trashed tasks are visible
