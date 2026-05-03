import random


def choose_difficulty():
	levels = {
		"1": (10, 5, "Easy"),
		"2": (50, 7, "Medium"),
		"3": (100, 10, "Hard"),
	}

	print("\nChoose difficulty:")
	print("1) Easy   (1-10, 5 tries)")
	print("2) Medium (1-50, 7 tries)")
	print("3) Hard   (1-100, 10 tries)")

	while True:
		choice = input("Enter 1, 2, or 3: ").strip()
		if choice in levels:
			return levels[choice]
		print("Invalid choice. Please enter 1, 2, or 3.")


def play_round():
	max_number, max_attempts, level_name = choose_difficulty()
	secret = random.randint(1, max_number)

	print(f"\n--- {level_name} Round ---")
	print(f"I picked a number between 1 and {max_number}.")
	print(f"You have {max_attempts} attempts to guess it.")

	for attempt in range(1, max_attempts + 1):
		while True:
			guess_text = input(f"Attempt {attempt}/{max_attempts} - Your guess: ").strip()
			if guess_text.isdigit():
				guess = int(guess_text)
				break
			print("Please enter a valid whole number.")

		if guess == secret:
			points = (max_attempts - attempt + 1) * 10
			print(f"Correct! You earned {points} points.")
			return points

		if guess < secret:
			print("Too low.")
		else:
			print("Too high.")

	print(f"Out of attempts! The number was {secret}.")
	return 0


def ask_play_again():
	while True:
		response = input("Play again? (y/n): ").strip().lower()
		if response in {"y", "yes"}:
			return True
		if response in {"n", "no"}:
			return False
		print("Please answer with y or n.")


def main():
	print("Welcome to Guess the Number!")
	total_score = 0
	rounds_played = 0

	while True:
		total_score += play_round()
		rounds_played += 1
		print(f"\nScore after {rounds_played} round(s): {total_score}")

		if not ask_play_again():
			break

	print("\nThanks for playing!")
	print(f"Final score: {total_score}")


if __name__ == "__main__":
	main()
