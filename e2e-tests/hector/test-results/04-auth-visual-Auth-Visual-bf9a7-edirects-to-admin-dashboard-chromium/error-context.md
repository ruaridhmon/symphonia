# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - img "Symphonia" [ref=e7]
      - paragraph [ref=e8]: Collaborative Consensus Platform
    - generic [ref=e9]:
      - heading "Sign In" [level=2] [ref=e10]
      - alert [ref=e12]: Login failed. Please try again.
      - generic [ref=e13]:
        - generic [ref=e14]: Email address
        - textbox "Email address" [ref=e15]:
          - /placeholder: you@example.com
          - text: antreas@axiotic.ai
      - generic [ref=e16]:
        - generic [ref=e17]: Password
        - generic [ref=e18]:
          - textbox "Password" [ref=e19]:
            - /placeholder: ••••••••
            - text: test123
          - button "Show password" [ref=e20] [cursor=pointer]:
            - img [ref=e21]
      - button "Sign In" [ref=e24] [cursor=pointer]
      - generic [ref=e25]:
        - text: Don't have an account?
        - link "Create one" [ref=e26] [cursor=pointer]:
          - /url: /register
  - generic "Notifications"
```