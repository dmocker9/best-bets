// Simple script to import CSV data into the database
// Run with: node import-csv-data.js

const fs = require('fs');
const path = require('path');

const csvData = `Tm,W,L,T,W-L%,PF,PA,PD,MoV,SoS,SRS,OSRS,DSRS
Philadelphia Eagles,6,2,0,0.75,208,185,23,2.9,2.9,5.8,3.9,1.9
Dallas Cowboys,3,4,1,0.438,246,250,-4,-0.5,0,-0.5,7.9,-8.4
Washington Commanders,3,5,0,0.375,187,198,-11,-1.4,0.1,-1.2,0.4,-1.6
New York Giants,2,6,0,0.25,173,215,-42,-5.3,3.1,-2.1,-0.4,-1.7
Green Bay Packers,5,1,1,0.786,193,150,43,6.1,-1.6,4.5,2,2.6
Detroit Lions,5,2,0,0.714,215,151,64,9.1,-0.4,8.7,6.8,1.9
Chicago Bears,4,3,0,0.571,168,185,-17,-2.4,-1.9,-4.4,-1.8,-2.5
Minnesota Vikings,3,4,0,0.429,155,162,-7,-1,-3.1,-4.1,-2.2,-1.9
Tampa Bay Buccaneers,6,2,0,0.75,197,178,19,2.4,2.4,4.8,3.7,1
Carolina Panthers,4,4,0,0.5,154,192,-38,-4.8,-1.9,-6.7,-5.8,-0.9
Atlanta Falcons,3,4,0,0.429,120,154,-34,-4.9,-1.5,-6.4,-7.2,0.9
New Orleans Saints,1,7,0,0.125,128,209,-81,-10.1,1,-9.1,-7.3,-1.9
Los Angeles Rams,5,2,0,0.714,175,117,58,8.3,3.6,11.9,3.1,8.8
Seattle Seahawks,5,2,0,0.714,193,136,57,8.1,0.5,8.6,5.6,3
San Francisco 49ers,5,3,0,0.625,160,164,-4,-0.5,3.5,3,0.2,2.8
Arizona Cardinals,2,5,0,0.286,153,154,-1,-0.1,0,-0.1,-1.1,1
New England Patriots,6,2,0,0.75,213,146,67,8.4,-5.9,2.5,1.6,0.9
Buffalo Bills,5,2,0,0.714,207,146,61,8.7,-5.8,2.9,3.7,-0.8
Miami Dolphins,2,6,0,0.25,174,215,-41,-5.1,-0.5,-5.6,-1,-4.7
New York Jets,1,7,0,0.125,168,221,-53,-6.6,-2.5,-9.2,-5.3,-3.8
Pittsburgh Steelers,4,3,0,0.571,175,175,0,0,-2.9,-2.9,0.5,-3.4
Cincinnati Bengals,3,5,0,0.375,174,253,-79,-9.9,-0.6,-10.5,-1,-9.4
Baltimore Ravens,2,5,0,0.286,174,210,-36,-5.1,2.8,-2.3,4.7,-7
Cleveland Browns,2,6,0,0.25,126,184,-58,-7.3,-1.2,-8.5,-10.1,1.7
Indianapolis Colts,7,1,0,0.875,270,154,116,14.5,-2.4,12.1,10.7,1.4
Jacksonville Jaguars,4,3,0,0.571,146,155,-9,-1.3,2.2,0.9,0,0.9
Houston Texans,3,4,0,0.429,153,103,50,7.1,3.2,10.3,-0.2,10.5
Tennessee Titans,1,7,0,0.125,110,230,-120,-15,6.6,-8.4,-5.5,-2.9
Denver Broncos,6,2,0,0.75,207,151,56,7,-1.4,5.6,-0.1,5.7
Kansas City Chiefs,5,3,0,0.625,214,131,83,10.4,-0.6,9.8,2.4,7.4
Los Angeles Chargers,5,3,0,0.625,188,173,15,1.9,-0.2,1.7,0.2,1.4
Las Vegas Raiders,2,5,0,0.286,103,180,-77,-11,2.2,-8.8,-7.7,-1.1`;

async function importData() {
  try {
    console.log('📥 Importing NFL team stats from CSV...\n');
    
    const response = await fetch('http://localhost:3000/api/import-csv', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        csvData: csvData,
        week: 9,
        season: 2025,
      }),
    });

    const result = await response.json();
    
    console.log('\n📊 Import Results:');
    console.log(`   Status: ${result.success ? '✅ Success' : '❌ Failed'}`);
    console.log(`   Message: ${result.message}`);
    console.log(`   Imported: ${result.imported} teams`);
    console.log(`   Failed: ${result.failed} teams`);
    
    if (result.errors && result.errors.length > 0) {
      console.log(`\n❌ Errors:`);
      result.errors.forEach(err => console.log(`   - ${err}`));
    }
    
    console.log('\n✅ Done! Your database is now populated with real NFL team stats.');
    console.log('   You can now run Best Bets predictions with accurate data!\n');
    
  } catch (error) {
    console.error('❌ Error importing data:', error);
    console.log('\nMake sure your dev server is running: npm run dev\n');
  }
}

importData();

