import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, combineLatest, debounceTime, distinctUntilChanged, lastValueFrom, map, of, shareReplay, switchMap, tap } from 'rxjs';

export interface PlanetSearchResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Planet[];
}

interface Planet {
  name: string;
  rotation_period: string;
  orbital_period: string;
  diameter: string;
  climate: string;
  gravity: string;
  terrain: string;
  surface_water: string;
  population: string;
  residents: string[];
  films: string[];
  created: string;
  edited: string;
  url: string;
}



@Injectable({
  providedIn: 'root',
})
export class PlanetsService {
  public http: HttpClient = inject(HttpClient);

  //extract these to configs
  url = `https://swapi.dev/api/planets/`
  debounceTimeMS = 500;

/**
 * Search for planets with debounce and inflight cancelling. Note: debounce impacts both search inputs and page changes.
 */
  search(source$: Observable<string>, page$: Observable<number>): Observable<PlanetSearchResponse> {

    // switch map will cancel previous inflight requests. Debounce before the switchmap prevents the http request until time completes.
    return combineLatest([source$, page$]).pipe(
      distinctUntilChanged(),
      debounceTime(this.debounceTimeMS),
      switchMap(([query, page]) => this.http.get<PlanetSearchResponse>(this.url + `?search=${query}&page=${page}`)),
      tap(console.log),
      shareReplay(1), //ensures latest value is used wherever this instance is subscribed
      catchError((err) => { throw new Error(err) }) // should log and notify/handle error
    );

  }

  public mapToPlanetNames(planets: PlanetSearchResponse) {
    return planets.results.map((planet: any) => planet.name);
  }

}
