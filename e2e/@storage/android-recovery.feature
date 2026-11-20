@storage @android-recovery
Feature: Android document recovery

  Scenario Outline: A valid recovery copy restores an unavailable main file
    Given Android storage has a "<state>" main file and a valid recovery copy
    When I open FreeZen
    Then Android storage restores the recovery copy automatically

    Examples:
      | state   |
      | missing |
      | corrupt |

  Scenario Outline: Recovery preserves files when opening would be unsafe
    Given Android storage has a "<state>" main file and a <backup> recovery copy
    When I open FreeZen
    Then FreeZen reports a storage load error without changing the files

    Examples:
      | state   | backup  |
      | newer   | valid   |
      | corrupt | invalid |

  Scenario: Opening an existing installation creates a recovery copy
    Given Android storage has a "valid" main file and a missing recovery copy
    When I open FreeZen
    Then Android storage copies the main file to the backup
