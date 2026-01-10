
level = 0
stack = []

def truncate(s, n=50):
    return s[:n] + '...' if len(s) > n else s

with open('public/js/app.js') as f:
    for i, line in enumerate(f):
        line_num = i + 1
        stripped = line.strip()
        # Ignore comments
        if stripped.startswith('//'): continue
        
        for char in line:
            if char == '{':
                level += 1
                stack.append((line_num, stripped))
            elif char == '}':
                level -= 1
                if stack: stack.pop()
        
print(f"Final Level: {level}")
if level > 0:
    print("Unclosed blocks (last 5):")
    for item in stack[-5:]:
        print(f"Line {item[0]}: {truncate(item[1])}")
