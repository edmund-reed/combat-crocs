Game starts, our turn begins:

1. Assess situation from current inputs - decide if a successful shot can be take from current position (use look-ahead feature for assistance)
2. If a successful shot can't be taken (successful means missile landing near enough to opponent (without terrain intersection of line-of-sight - i.e there is a direct line between missile and opponent) to cause them damage), output a movement (-x, 0, +x) instead of a shot
3. From the new position (with updated inputs), we start the process again - i.e assess current situation from new inputs, use look-ahead feature to determine if successful shot can be taken, if not, output another movement

We have 30 seconds (the time of a full turn) before we need to take a shot, so we can effectively execute multiple "turns" within this 30 seconds, ending by shooting from a satisfactory position
