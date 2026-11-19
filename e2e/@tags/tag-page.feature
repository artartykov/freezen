Feature: Tag page

  Background:
    Given I complete onboarding
    And I create the following tasks:
      | name   | state | tags      |
      | Task 1 | inbox | Work      |
      | Task 2 | next  | Work,Home |
      | Task 3 | next  | Home      |

  Scenario: A tag page groups its tasks by state
    When I choose the tag "Work" from the menu
    Then I see the tag page "Work"
    And I see 2 tasks on the tag page
    And I see the following tasks in the "Inbox" group of the tag page:
      | name   |
      | Task 1 |
    And I see the following tasks in the "Next" group of the tag page:
      | name   |
      | Task 2 |

  Scenario: A task with several tags appears on each of its tag pages
    When I choose the tag "Home" from the menu
    Then I see the tag page "Home"
    And I see 2 tasks on the tag page
    And I see the following tasks in the "Next" group of the tag page:
      | name   |
      | Task 2 |
      | Task 3 |

  Scenario: Completed tasks of the tag appear in Done
    Given I complete the task "Task 3" in the Next
    When I choose the tag "Home" from the menu
    Then I see 2 tasks on the tag page
    And I see the following tasks in the "Next" group of the tag page:
      | name   |
      | Task 2 |
    And I see the following tasks in the "Done" group of the tag page:
      | name   |
      | Task 3 |

  Scenario: The "All" chip opens the page with every task
    When I choose the tag "All" from the menu
    Then I see the tag page "All"
    And I see the following tasks in the "Inbox" group of the tag page:
      | name   |
      | Task 1 |
    And I see among the "Next" group of the tag page the tasks:
      | name   |
      | Task 2 |
      | Task 3 |

  Scenario: The "Untagged" chip opens the page with tasks without tags
    Given I create the following tasks:
      | name   | state | tags |
      | Task 4 | inbox |      |
    When I choose the tag "Untagged" from the menu
    Then I see the tag page "Untagged"
    And I see the following tasks in the "Inbox" group of the tag page:
      | name   |
      | Task 4 |

  Scenario: A task created on a tag page goes to the Inbox with that tag
    When I choose the tag "Home" from the menu
    And I create the following tasks:
      | name   |
      | Task 5 |
    Then I see the following tasks in the "Inbox" group of the tag page:
      | name   |
      | Task 5 |

  Scenario: A task created on the Untagged page goes to the Inbox without tags
    When I choose the tag "Untagged" from the menu
    And I create the following tasks:
      | name   |
      | Task 5 |
    Then I see the following tasks in the "Inbox" group of the tag page:
      | name   |
      | Task 5 |

  Scenario: A task created on the All page goes to the Inbox without tags
    When I choose the tag "All" from the menu
    And I create the following tasks:
      | name   |
      | Task 5 |
    And I choose the tag "Untagged" from the menu
    Then I see the following tasks in the "Inbox" group of the tag page:
      | name   |
      | Task 5 |

  Scenario: The filter chips narrow the tasks on the tag page
    When I choose the tag "Home" from the menu
    And I select the "Work" filter chip
    Then I see 1 task on the tag page
    And I see the following tasks in the "Next" group of the tag page:
      | name   |
      | Task 2 |

  Scenario: The filter chips do not include the current tag
    When I choose the tag "Home" from the menu
    Then I see the following filter chips on the tag page:
      | name |
      | All  |
      | Work |

  Scenario: The filter chips include Due, Time and Energy when tasks have them
    Given I create the following tasks:
      | name   | state | tags | due        | time       | energy      |
      | Task 4 | next  | Home | 2099-12-31 | 15 minutes | High energy |
    When I choose the tag "Home" from the menu
    Then I see the following filter chips on the tag page:
      | name   |
      | All    |
      | Due    |
      | Time   |
      | Energy |
      | Work   |
