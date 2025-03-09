import { access, readFile, writeFile } from 'fs/promises';

async function main() {
	try {

		try {
			await access('instrukce.txt');
		} catch (err) {
			console.error('Súbor instrukce.txt neexistuje!');
			return;
		}

		const instrukcie = await readFile('instrukce.txt', 'utf8');

		const [zdrojovySub, cielovySub] = instrukcie.trim().split(' ');

		if (!zdrojovySub || !cielovySub) {
			console.error('Nesprávny formát inštrukcií v súbore!');
			return;
		}

		console.log(`Kopírujem obsah zo súboru '${zdrojovySub}' do súboru '${cielovySub}'`);

		try {
			await access(zdrojovySub);
		} catch (err) {
			console.error(`Zdrojový súbor '${zdrojovySub}' neexistuje!`);
			return;
		}

		const obsah = await readFile(zdrojovySub, 'utf8');

		await writeFile(cielovySub, obsah);

		console.log('Kopírovanie bolo úspešne dokončené!');
	} catch (err) {
		console.error('Nastala chyba:', err);
	}
}

main();