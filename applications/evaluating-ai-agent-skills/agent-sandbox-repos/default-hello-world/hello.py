"""Simple hello world script for agent sandbox testing."""


def greet(name: str = "World") -> str:
    return f"Hello, {name}!"


if __name__ == "__main__":
    print(greet())

