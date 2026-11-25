Feature: Responsive navigation

  Scenario Outline: The menu and page sit together at <width> pixels
    Given I start with onboarding already completed
    When I resize the browser to <width> pixels wide
    Then the persistent menu and the page form a centered two-column layout
    When I follow Inbox in the persistent menu
    Then the persistent menu and the page form a centered two-column layout

    Examples:
      | width |
      | 768   |
      | 1440  |

  Scenario: The mobile drawer becomes persistent when the window grows
    Given I start with onboarding already completed
    When I resize the browser to 767 pixels wide
    Then navigation opens as a modal drawer
    When I resize the browser to 768 pixels wide
    Then the persistent menu and the page form a centered two-column layout
    When I resize the browser to 767 pixels wide
    Then navigation opens as a modal drawer
