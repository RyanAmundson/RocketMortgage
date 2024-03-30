import { CommonModule } from '@angular/common';
import { Component, WritableSignal, effect, inject, signal, untracked, } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';
import { PlanetSearchResponse, PlanetsService } from './planets.service';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { Observable, catchError, map, merge, tap } from 'rxjs';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, FormsModule, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})


/**
 * There are a few good options for pagination depending on requirements. Infinite scroll and pages might look slightly different.
 * Some edge cases handled:
 * - prevent paging past end of list and to negative or 0 page
 * - prevent error from leaving search in loading state
 * - Resets page when a new search is initiated to prevent 404 on a narrowed search result
 */
export class AppComponent {
  /**
   * Dependencies
   */
  public planetService: PlanetsService = inject(PlanetsService);

  // Writable Signal to maintain search string, could be BehaviorSubject or just string as well.
  searchQuery: WritableSignal<string> = signal('');
  page: WritableSignal<number> = signal(1);

  // this prevents running searches with a page outside of the range. i.e. paging to page 3 then searching a query with less than 3 pages.
  ref = effect(() => {
    if (this.searchQuery()) {
      untracked(() => this.page.set(1))
    }
  });

  /**
   * Decided on sending a source observable into the planet service as it gives several benefits: 
   * - Any other component using the Planet Service search function gets its own observable. (no clashing in request debounce and cancellation)
   * - Declarative implementations and better readability
   * - Allows for debounce and cancellation at the API request keeping it consistent across all usage.
  */
  searchResponse$: Observable<PlanetSearchResponse> = this.planetService.search(
    toObservable(this.searchQuery),
    toObservable(this.page)
  );

  searchResults$: Observable<string[]> = this.searchResponse$.pipe(
    map(this.planetService.mapToPlanetNames),
  );

  totalResultCount$: Observable<number> = this.searchResponse$.pipe(
    map((response) => response.count),
  );

  hasPrevPage = toSignal(this.searchResponse$.pipe(
    map((response: PlanetSearchResponse) => response.previous !== null ? true : false),
  ));

  hasNextPage = toSignal(this.searchResponse$.pipe(
    map((response: PlanetSearchResponse) => response.next !== null ? true : false),
  ));

  error$ = this.searchResponse$.pipe(
    catchError((err) => this.handleError(err)),
    tap(console.log),
  )

  // loading that is declarative and entensible by adding triggers mapping to the desired state. I.E. page signal changes => loading maps to true, then result 
  loading = toSignal(
    merge(
      toObservable(this.page).pipe(map(() => true)),
      toObservable(this.searchQuery).pipe(map(() => true)),
      this.searchResponse$.pipe(map(() => false)),
      this.error$.pipe(map(() => false)),
    )
  );

  previousPage() {
    this.page.update((cur) => cur - 1);
  }

  nextPage() {
    this.page.update((cur) => cur + 1);
  }

  goToPage(newPage: number) {
    this.page.set(newPage);
  }

  handleError(err: any): any {
    this.searchQuery.set('')
    throw "Not implemented yet";
  }


}
