Feature: Move a reference item

  Background:
    Given I complete onboarding
    And I create the reference list "Archive"
    And I create the reference list "Reading list"
    And I add the reference item "Read the guide"

  Scenario: Swiping right opens Move for a reference item
    When I swipe right on the reference item "Read the guide"
    And I choose "Archive" in the move menu
    Then the reference item "Read the guide" is absent
    When I go to the Archive
    Then I see "Read the guide" as a reference item

  Scenario: Swiping left selects a reference item for moving
    When I swipe left on the reference item "Read the guide"
    Then the reference item "Read the guide" is selected
    When I click Move for the selected reference items
    And I choose "Archive" in the move menu
    Then the reference item "Read the guide" is absent
    When I go to the Archive
    Then I see "Read the guide" as a reference item

  Scenario: The reference item editor can move the item to another list
    When I open the reference item "Read the guide"
    And I click Move in the reference item editor
    And I choose "Archive" in the move menu
    Then the reference item "Read the guide" is absent
    When I go to the Archive
    Then I see "Read the guide" as a reference item

  Scenario: Moving a reference item to Inbox creates a task
    When I swipe right on the reference item "Read the guide"
    Then the move menu does not offer "None"
    And I choose "Inbox" in the move menu
    Then the reference item "Read the guide" is absent
    When I go to the Inbox
    Then I see "Read the guide" as an active task

  Scenario: Moving a reference item to a project creates a project task
    Given I choose New Project from the menu
    And I enter "Website" as the project name
    And I save the project
    And I go to the Reading list
    When I open the reference item "Read the guide"
    And I click Move in the reference item editor
    And I choose "Website" in the move menu
    Then the reference item "Read the guide" is absent
    When I go to the "Website" project
    Then I see "Read the guide" as an active task

  Scenario: Moving a reference item to Trash keeps it recoverable
    When I swipe right on the reference item "Read the guide"
    And I choose "Trash" in the move menu
    Then the reference item "Read the guide" is absent
    When I go to the Trash
    And I restore the reference item "Read the guide" from Trash
    When I go to the Reading list
    Then I see "Read the guide" as a reference item
