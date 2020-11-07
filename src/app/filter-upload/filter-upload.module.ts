import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserFilterComponent } from './user-filter/user-filter.component';
import { FilterUploadRoutingModule } from './filter-upload-routing.module';
import { SharedModule } from '../shared/shared.module';


@NgModule({
  declarations: [UserFilterComponent],
  imports: [
    CommonModule, FilterUploadRoutingModule,
    SharedModule
  ]
})
export class FilterUploadModule { }
