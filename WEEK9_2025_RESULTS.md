# NFL Week 9 (2025 Season) Game Results

## 📊 Summary
**Week:** 9  
**Season:** 2025  
**Dates:** October 27 - November 2, 2025

---

## 🏈 Week 9 Game Results

### Monday, October 27, 2025

1. **Washington Commanders @ Kansas City Chiefs**
   - Score: Washington Commanders 7 - 28 Kansas City Chiefs
   - **Winner:** Kansas City Chiefs
   - Status: Final

### Thursday, October 30, 2025

2. **Baltimore Ravens @ Miami Dolphins**
   - Score: Baltimore Ravens 28 - 6 Miami Dolphins
   - **Winner:** Baltimore Ravens
   - Status: Final

### Sunday, November 2, 2025

3. **Denver Broncos @ Houston Texans**
   - Score: Denver Broncos 18 - 15 Houston Texans
   - **Winner:** Denver Broncos
   - Status: Final

4. **San Francisco 49ers @ New York Giants**
   - Score: San Francisco 49ers 34 - 24 New York Giants
   - **Winner:** San Francisco 49ers
   - Status: Final

5. **Indianapolis Colts @ Pittsburgh Steelers**
   - Score: Indianapolis Colts 20 - 27 Pittsburgh Steelers
   - **Winner:** Pittsburgh Steelers
   - Status: Final

6. **Carolina Panthers @ Green Bay Packers**
   - Score: Carolina Panthers 16 - 13 Green Bay Packers
   - **Winner:** Carolina Panthers
   - Status: Final

7. **Minnesota Vikings @ Detroit Lions**
   - Score: Minnesota Vikings 27 - 24 Detroit Lions
   - **Winner:** Minnesota Vikings
   - Status: Final
   - **Note:** J.J. McCarthy returned from injury with 2 TD passes and 1 rushing TD

8. **Los Angeles Chargers @ Tennessee Titans**
   - Score: Los Angeles Chargers 27 - 20 Tennessee Titans
   - **Winner:** Los Angeles Chargers
   - Status: Final

9. **Atlanta Falcons @ New England Patriots**
   - Score: Atlanta Falcons 23 - 24 New England Patriots
   - **Winner:** New England Patriots
   - Status: Final

10. **Chicago Bears @ Cincinnati Bengals**
    - Score: Chicago Bears 47 - 42 Cincinnati Bengals
    - **Winner:** Chicago Bears
    - Status: Final

11. **Jacksonville Jaguars @ Las Vegas Raiders**
    - Score: Jacksonville Jaguars 30 - 29 Las Vegas Raiders
    - **Winner:** Jacksonville Jaguars
    - Status: Final (OT)
    - **Note:** DaVon Hamilton batted down a two-point conversion attempt to seal the win

12. **New Orleans Saints @ Los Angeles Rams**
    - Score: New Orleans Saints 10 - 34 Los Angeles Rams
    - **Winner:** Los Angeles Rams
    - Status: Final

13. **Kansas City Chiefs @ Buffalo Bills**
    - Score: Kansas City Chiefs 21 - 28 Buffalo Bills
    - **Winner:** Buffalo Bills
    - Status: Final
    - **Note:** Josh Allen led with 2 rushing TDs and 1 passing TD, improving record vs Mahomes to 5-1

14. **Seattle Seahawks @ Washington Commanders**
    - Score: Seattle Seahawks 38 - 14 Washington Commanders
    - **Winner:** Seattle Seahawks
    - Status: Final
    - **Note:** Sam Darnold completed 21 of 24 passes for 325 yards and 4 touchdowns

15. **Arizona Cardinals @ Dallas Cowboys**
    - Score: Arizona Cardinals 27 - 17 Dallas Cowboys
    - **Winner:** Arizona Cardinals
    - Status: Final
    - **Note:** Jacoby Brissett accounted for 3 touchdowns (2 passing, 1 rushing), snapping 5-game losing streak

---

## 📝 Notable Performances

- **Sam Darnold (Seahawks):** 21/24, 325 yards, 4 TDs
- **Josh Allen (Bills):** 2 rushing TDs, 1 passing TD vs Chiefs
- **J.J. McCarthy (Vikings):** Returned from injury with 2 TD passes, 1 rushing TD
- **Jacoby Brissett (Cardinals):** 3 TDs (2 passing, 1 rushing)

---

## 🔗 API Endpoint

You can fetch these results programmatically using:

```
GET http://localhost:3000/api/week9-results?week=9&season=2025
```

Or use the function directly:

```typescript
import { fetchWeek9GameResults } from '@/lib/fetchNFLStats';

const results = await fetchWeek9GameResults(9, 2025);
```

---

## 📅 Notes

- All games are Final
- Data retrieved from ESPN API and verified sources
- Week 9 of the 2025 NFL season (October 27 - November 2, 2025)
- Total: 15 games (including Monday and Thursday night games)

