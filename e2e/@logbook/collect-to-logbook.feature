Feature: Collect completed tasks to Logbook

  Scenario: Collecting Done tasks logs them immediately without confirmation
    Given I complete onboarding
    And I set On completion to "Move to bottom of page"
    And I create the following tasks:
      | name          | state   |
      | First done    | next    |
      | Second done   | next    |
      | Still active  | next    |
      | Elsewhere     | someday |
    And I complete the task "Elsewhere" in the Someday
    And I complete the task "First done" in the Next
    And I complete the task "Second done" in the Next
    And I toggle Done
    When I collect Done tasks to Logbook
    Then there is no Done group
    And I see the task "Still active" in the Next
    When I go to the Logbook
    Then I see the task "First done" in the Logbook
    And I see the task "Second done" in the Logbook
    And "Elsewhere" is absent from the Logbook

  Scenario: A collected project task appears in its project Logged group
    Given I complete onboarding
    And I set On completion to "Move to bottom of page"
    And I choose New Project from the menu
    And I enter "Website" as the project name
    And I save the project
    And I go to the "Website" project
    And I create the following tasks:
      | name             |
      | Publish homepage |
    And I mark "Publish homepage" done on the project page
    And I toggle Done
    When I collect Done tasks to Logbook
    Then there is no Done group
    And the project Logged group is collapsed with a count of 1
    When I expand the project Logged group
    Then the project Logged group shows "Publish homepage"
    And the project header shows "1 of 1 done"
    When I go to the Logbook
    Then "Publish homepage" is absent from the Logbook
