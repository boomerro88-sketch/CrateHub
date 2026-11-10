# CrateHub 1.2.0 — instrukcja instalacji

CrateHub uruchamia się we własnym oknie. Wybierz instalator dla swojego komputera z załączników wydania na GitHubie. Potrzebujesz połączenia z internetem do YouTube i funkcji korzystających z serwisów zewnętrznych.

## Jaki plik wybrać?

- **Mac z procesorem Apple M1/M2/M3/M4/M5:** `CrateHub-1.2.0-macOS-Apple-Silicon.dmg`.
- **Mac z procesorem Intel:** `CrateHub-1.2.0-macOS-Intel.dmg`.
- **Windows 10 lub 11, 64-bitowy Intel/AMD:** `CrateHub-1.2.0-Windows-x64-Setup.exe`. Ten instalator nie obsługuje 32-bitowego Windows.

Na Macu wybierz menu Apple → Ten Mac, aby sprawdzić procesor. W Windows wybierz Ustawienia → System → Informacje i sprawdź „Typ systemu”.

## Instalacja na Macu

1. Pobierz właściwy plik DMG i otwórz go.
2. Przeciągnij CrateHub do folderu Aplikacje i uruchom z tego folderu.
3. Aplikacja nie posiada certyfikatu Apple Developer ID ani notaryzacji, więc macOS może wyświetlić ostrzeżenie. Korzystaj z systemowej opcji otwierania aplikacji od niezidentyfikowanego dewelopera, jeśli ufasz źródłu; nie wyłączaj ochrony całego systemu.

## Instalacja na Windows

1. Pobierz i uruchom instalator EXE, wybierz język oraz postępuj według instrukcji.
2. Uruchom CrateHub z menu Start lub skrótu na pulpicie.
3. Program jest niepodpisany, dlatego Windows może wyświetlić ostrzeżenie o nieznanym wydawcy. Jeśli brakuje Microsoft WebView2, instalator próbuje go doinstalować z internetu.

Python, Node i FFmpeg są dołączone, nie trzeba ich instalować osobno. Dostępność filmów i zewnętrznych usług może się zmieniać.

## Przenoszenie danych

Przy przejściu ze starszej wersji aplikacji na tym samym komputerze katalog i zapisane dane pozostają na miejscu. Nowe nagrania z instalatora są dodawane do istniejącej bazy. Dla bezpieczeństwa wyeksportuj skrzynki przed aktualizacją.

Aby przenieść skrzynki ze strony do aplikacji: w stronie użyj „Rozpakuj skrzynkę” i zapisz JSON, a w aplikacji użyj „Zapakuj skrzynkę” i wskaż plik. Markery odtwarzacza i zapisy analizy mogą być przechowywane osobno w profilu przeglądarki; sam eksport skrzynek nie gwarantuje ich przeniesienia.

Wersja testowa. Wyniki analizy tempa i tonacji są szacunkami, nie gwarantują poprawności. Sumy SHA-256 w pliku wydania pozwalają zweryfikować pobrane instalatory.
