#include "bits/stdc++.h"
using namespace std;

class Player
{
private:
    char symbol;
    string name;

public:
    Player(char sym = 'X', string n = "Player X") : symbol(sym), name(n) {}

    char getSymbol() { return symbol; }
    string getName() { return name; }
};

class Board
{
private:
    char grid[3][3];
    int cellsFilled;

public:
    Board() : cellsFilled(0)
    {
        for (int i = 0; i < 3; i++)
        {
            for (int j = 0; j < 3; j++)
            {
                grid[i][j] = ' ';
            }
        }
    }

    void drawBoard() const
    {
        cout << "------------" << endl;
        for (int i = 0; i < 3; i++)
        {
            cout << "|";
            for (int j = 0; j < 3; j++)
            {
                cout << grid[i][j] << "|";
            }
            cout << endl
                 << "------------" << endl;
        }
    }

    bool isValidMove(int row, int col) const
    {

        return (row >= 0 && row < 3 && col >= 0 && col < 3 && grid[row][col] == ' ');
    }

    void makeMove(int row, int col, char symbol)
    {

        if (isValidMove(row, col))
        {
            grid[row][col] = symbol;
            cellsFilled++;
        }
    }

    bool checkWin(char symbol) const
    {

        for (int i = 0; i < 3; i++)
        {
            if (grid[i][0] == symbol && grid[i][1] == symbol && grid[i][2] == symbol)
                return true;
        }

        for (int i = 0; i < 3; i++)
        {
            if (grid[0][i] == symbol && grid[1][i] == symbol && grid[2][i] == symbol)
                return true;
        }

        if (grid[0][0] == symbol && grid[1][1] == symbol && grid[2][2] == symbol)
            return true;

        if (grid[0][2] == symbol && grid[1][1] == symbol && grid[2][0] == symbol)
            return true;

        return false;
    }

    bool isFull() const
    {
        return cellsFilled == 9;
    }

    int getFilledCellsCount() const
    {
        return cellsFilled;
    }
};

class TicTacToe
{
private:
    Board board;
    Player players[2];
    int currentPlayerIndex;

public:
    TicTacToe() : currentPlayerIndex(0)
    {
        players[0] = Player();
        players[1] = Player('O', "Player O");
    }

    Player &getCurrentPlayer()
    {
        return players[currentPlayerIndex];
    }

    void switchTurn()
    {
        currentPlayerIndex++;
        currentPlayerIndex %= 2;
    }

    void play()
    {
        int num, row, col;
        cout << "Welcome to Tic-Tac-Toe!" << endl;

        while (!board.isFull())
        {
            board.drawBoard();

            Player &currentPlayer = getCurrentPlayer();

            while (1)
            {
                cout << currentPlayer.getName() << " (" << currentPlayer.getSymbol() << ") ";

                cout << "Enter 1-9" << endl;
                cin >> num;
                num--;
                row = num / 3;
                col = num % 3;

                if (board.isValidMove(row, col))
                {
                    break;
                }
                else
                {
                    cout << "invalid! Try again" << endl;
                }
            }

            board.makeMove(row, col, currentPlayer.getSymbol());

            if (board.getFilledCellsCount() > 4 && board.checkWin(currentPlayer.getSymbol()))
            {
                cout << currentPlayer.getName() << " wins!" << endl;

                return;
            }

            switchTurn();
        }

        board.drawBoard();
        cout << "its a draw!" << endl;
    }
};